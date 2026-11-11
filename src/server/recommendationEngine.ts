import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  careerRecommendations,
  careers,
  skillScores,
  testResults,
} from '../db/schema.ts';

const ACADEMIC_KEYS = new Set([
  'mathematics',
  'natural_sciences',
  'languages_literature',
  'it_technology',
]);

const COGNITIVE_KEYS = new Set([
  'logical_thinking',
  'memory_attention',
  'creativity',
]);

const INTEREST_KEYS = new Set([
  'riasec_r',
  'riasec_i',
  'riasec_a',
  'riasec_s',
  'riasec_e',
  'riasec_c',
]);

const SKILL_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  mathematics: { uz: 'Matematika', ru: 'Математика', en: 'Mathematics' },
  natural_sciences: { uz: 'Tabiiy fanlar', ru: 'Естественные науки', en: 'Natural Sciences' },
  languages_literature: { uz: 'Tillar va adabiyot', ru: 'Языки и литература', en: 'Languages & Literature' },
  it_technology: { uz: 'IT va texnologiyalar', ru: 'ИТ и технологии', en: 'IT & Technology' },
  logical_thinking: { uz: 'Mantiqiy fikrlash', ru: 'Логическое мышление', en: 'Logical Thinking' },
  memory_attention: { uz: 'Xotira va diqqat', ru: 'Память и внимание', en: 'Memory & Attention' },
  creativity: { uz: 'Ijodkorlik', ru: 'Креативность', en: 'Creativity' },
  riasec_r: { uz: 'Amaliy-texnik qiziqish (R)', ru: 'Практический интерес (R)', en: 'Realistic Interest (R)' },
  riasec_i: { uz: 'Tadqiqotchi qiziqish (I)', ru: 'Исследовательский интерес (I)', en: 'Investigative Interest (I)' },
  riasec_a: { uz: 'Ijodiy qiziqish (A)', ru: 'Творческий интерес (A)', en: 'Artistic Interest (A)' },
  riasec_s: { uz: 'Ijtimoiy qiziqish (S)', ru: 'Социальный интерес (S)', en: 'Social Interest (S)' },
  riasec_e: { uz: 'Tadbirkorlik qiziqishi (E)', ru: 'Предпринимательский интерес (E)', en: 'Enterprising Interest (E)' },
  riasec_c: { uz: 'Tizimli qiziqish (C)', ru: 'Системный интерес (C)', en: 'Conventional Interest (C)' },
};

function labelFor(key: string, lang: 'uz' | 'ru' | 'en'): string {
  return SKILL_LABELS[key]?.[lang] ?? key;
}

function computeGroupScore(
  weights: Record<string, number>,
  userScores: Map<string, number>,
  allowedKeys: Set<string>
): { score: number; assessedWeight: number; totalGroupWeight: number } {
  let weightedSum = 0;
  let assessedWeight = 0;
  let totalGroupWeight = 0;

  for (const [key, w] of Object.entries(weights)) {
    if (!allowedKeys.has(key)) continue;
    totalGroupWeight += w;
    if (userScores.has(key)) {
      weightedSum += userScores.get(key)! * w;
      assessedWeight += w;
    }
  }

  if (totalGroupWeight === 0) {
    return { score: 0, assessedWeight: 0, totalGroupWeight: 0 };
  }
  if (assessedWeight === 0) {
    return { score: 0, assessedWeight: 0, totalGroupWeight };
  }
  return {
    score: Math.round((weightedSum / assessedWeight) * 10) / 10,
    assessedWeight,
    totalGroupWeight,
  };
}

export async function recomputeCareerRecommendations(userId: number) {
  try {
    const userSkillRows = await db
      .select()
      .from(skillScores)
      .where(eq(skillScores.userId, userId));

    const completedResults = await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId));

    if (userSkillRows.length === 0 || completedResults.length === 0) {
      await db
        .delete(careerRecommendations)
        .where(eq(careerRecommendations.userId, userId));
      return [];
    }

    const scoreMap = new Map<string, number>();
    for (const row of userSkillRows) {
      scoreMap.set(row.skillKey, row.scorePercentage);
    }

    const allCareers = await db.select().from(careers);
    if (allCareers.length === 0) return [];

    const scoredCareers = allCareers.map((career) => {
      const weights = career.weightProfileJson;
      let totalWeight = 0;
      let coveredWeight = 0;
      let weightedScoreSum = 0;

      const strengths: string[] = [];
      const toDevelop: string[] = [];

      const sortedDimensions = Object.entries(weights).sort((a, b) => b[1] - a[1]);

      for (const [dim, w] of sortedDimensions) {
        totalWeight += w;
        const measured = scoreMap.get(dim);
        if (measured !== undefined) {
          coveredWeight += w;
          weightedScoreSum += measured * w;
          if (measured >= 65) {
            strengths.push(`${labelFor(dim, 'uz')} (${Math.round(measured)}%)`);
          } else {
            toDevelop.push(`${labelFor(dim, 'uz')} (${Math.round(measured)}%)`);
          }
        } else {
          toDevelop.push(`${labelFor(dim, 'uz')} (hali baholanmagan)`);
        }
      }

      const acad = computeGroupScore(weights, scoreMap, ACADEMIC_KEYS);
      const cog = computeGroupScore(weights, scoreMap, COGNITIVE_KEYS);
      const intr = computeGroupScore(weights, scoreMap, INTEREST_KEYS);

      // Transparent match score: weighted fit over assessed dimensions, scaled softly by coverage
      // so completing more relevant categories improves confidence without fabricating unassessed scores.
      const rawWeightedFit = coveredWeight > 0 ? weightedScoreSum / coveredWeight : 0;
      const coverageRatio = totalWeight > 0 ? coveredWeight / totalWeight : 0;
      const confidenceFactor = 0.65 + 0.35 * coverageRatio;
      const finalMatchScore = Math.round(rawWeightedFit * confidenceFactor * 10) / 10;

      const topStrengthLabels = strengths.slice(0, 3);
      const topGapLabels = toDevelop.slice(0, 3);

      const coveragePct = Math.round(coverageRatio * 100);
      const matchReasonUz =
        topStrengthLabels.length > 0
          ? `Sizning topshirgan testlaringizda (${coveragePct}% qamrov) ${topStrengthLabels.join(', ')} ko‘rsatkichlaringiz ushbu yo‘nalish talablariga mos kelmoqda. Bu tavsiya kafolat emas, balki hozirgi natijalaringiz asosidagi shaffof tahlildir.`
          : `Hozircha ${coveragePct}% mos yo‘nalishlar baholangan. Barcha tegishli fan va qiziqish testlarini yakunlasangiz, moslik aniqroq ko‘rinadi.`;

      const matchReasonRu =
        topStrengthLabels.length > 0
          ? `По результатам пройденных тестов (охват критериев ${coveragePct}%) ваши сильные показатели (${topStrengthLabels.join(', ')}) соответствуют профилю направления. Это аналитический ориентир, а не гарантия.`
          : `Оценено ${coveragePct}% ключевых критериев. Завершите остальные категории для более точного сопоставления.`;

      const matchReasonEn =
        topStrengthLabels.length > 0
          ? `Across your completed assessments (${coveragePct}% criteria coverage), strong performance in ${topStrengthLabels.join(', ')} aligns well with this pathway. This reflects measured scores, not a guarantee of success.`
          : `${coveragePct}% of career criteria assessed so far. Complete more assessments for fuller transparency.`;

      return {
        career,
        finalMatchScore,
        academicMatchScore: acad.score,
        cognitiveMatchScore: cog.score,
        interestMatchScore: intr.score,
        strengths: topStrengthLabels,
        skillsToDevelop: topGapLabels,
        matchReasonUz,
        matchReasonRu,
        matchReasonEn,
      };
    });

    scoredCareers.sort((a, b) => b.finalMatchScore - a.finalMatchScore);
    const topThree = scoredCareers.slice(0, 3);

    await db.transaction(async (tx) => {
      await tx
        .delete(careerRecommendations)
        .where(eq(careerRecommendations.userId, userId));

      for (let i = 0; i < topThree.length; i++) {
        const item = topThree[i];
        await tx.insert(careerRecommendations).values({
          userId,
          careerId: item.career.id,
          rank: i + 1,
          matchScore: item.finalMatchScore,
          academicMatchScore: item.academicMatchScore,
          cognitiveMatchScore: item.cognitiveMatchScore,
          interestMatchScore: item.interestMatchScore,
          matchReasonUz: item.matchReasonUz,
          matchReasonRu: item.matchReasonRu,
          matchReasonEn: item.matchReasonEn,
          strengthsJson: item.strengths,
          skillsToDevelopJson: item.skillsToDevelop,
        });
      }
    });

    return topThree;
  } catch (error) {
    console.error('Failed to recompute career recommendations:', error);
    throw new Error('Failed to generate career recommendations.', { cause: error });
  }
}
