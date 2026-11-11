import { GoogleGenAI } from '@google/genai';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  advisorMessages,
  careerRecommendations,
  careers,
  skillScores,
  testCategories,
  testResults,
  userProfiles,
  userSettings,
} from '../db/schema.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateAdvisorReply(params: {
  userId: number;
  message: string;
  language?: 'uz' | 'ru' | 'en';
}) {
  const { userId, message } = params;
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error('AI_UNAVAILABLE');
  }

  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });
    const lang = params.language ?? (settings?.language as 'uz' | 'ru' | 'en') ?? 'uz';

    const scores = await db
      .select()
      .from(skillScores)
      .where(eq(skillScores.userId, userId));

    const results = await db
      .select({
        percentageScore: testResults.percentageScore,
        measurementType: testResults.measurementType,
        summaryText: testResults.summaryText,
        createdAt: testResults.createdAt,
        categoryTitleUz: testCategories.titleUz,
        categoryTitleEn: testCategories.titleEn,
      })
      .from(testResults)
      .innerJoin(testCategories, eq(testResults.categoryId, testCategories.id))
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt))
      .limit(12);

    const recs = await db
      .select({
        rank: careerRecommendations.rank,
        matchScore: careerRecommendations.matchScore,
        academicMatchScore: careerRecommendations.academicMatchScore,
        cognitiveMatchScore: careerRecommendations.cognitiveMatchScore,
        interestMatchScore: careerRecommendations.interestMatchScore,
        titleUz: careers.titleUz,
        titleEn: careers.titleEn,
        relevantSubjectsJson: careers.relevantSubjectsJson,
        necessarySkillsJson: careers.necessarySkillsJson,
      })
      .from(careerRecommendations)
      .innerJoin(careers, eq(careerRecommendations.careerId, careers.id))
      .where(eq(careerRecommendations.userId, userId))
      .orderBy(asc(careerRecommendations.rank));

    const recentMessages = await db
      .select()
      .from(advisorMessages)
      .where(eq(advisorMessages.userId, userId))
      .orderBy(desc(advisorMessages.id))
      .limit(8);

    const langInstruction =
      lang === 'ru'
        ? 'Отвечай на русском языке, понятно, уважительно и структурированно.'
        : lang === 'en'
          ? 'Respond in English clearly, constructively, and concisely.'
          : 'O‘zbek tilida tushunarli, do‘stona, dalillarga asoslangan va tuzilmali javob bering.';

    const studentContext = {
      fullName: profile?.fullName ?? 'O‘quvchi',
      schoolGrade: profile?.schoolGrade ?? null,
      schoolName: profile?.schoolName ?? null,
      interestsNote: profile?.interestsText ?? null,
      completedAssessmentsCount: results.length,
      skillScores: scores.map((s) => ({
        skill: s.skillKey,
        type: s.measurementType,
        scorePct: s.scorePercentage,
      })),
      recentResults: results,
      topRecommendations: recs,
    };

    const systemInstruction = `Siz KASB TANLA platformasining ta’lim va kasb bo‘yicha maslahatchisisiz.
${langInstruction}

MUHIM QOIDALAR:
1. Faqat talabaning ma’lumotlar bazasidagi HAQIQIY natijalariga tayaning. Hech qachon mavjud bo‘lmagan test ballarini to‘qib chiqarmang. Agar talaba hali test topshirmagan bo‘lsa, qaysi kategoriyalardan boshlashni tavsiya qiling.
2. Bilim testlari (Matematika, Tabiiy fanlar, Tillar, IT), Kognitiv qobiliyatlar (Mantiq, Xotira/diqqat, Ijodkorlik) va Shaxsiy qiziqishlarni (RIASEC) aniq farqlang.
3. Hech qachon talabaga biror kasbda 100% muvaffaqiyat kafolatlanadi demang; tavsiyalarni hozirgi ko‘rsatkichlar va rivojlantirish imkoniyati sifatida tushuntiring.
4. Amaliy o‘quv mashg‘ulotlari, maktab fanlari bo‘yicha qadamlar va shaxsiy o‘qish rejasi taklif qiling.

TALABANING REAL NATIJALARI (PostgreSQL):
${JSON.stringify(studentContext, null, 2)}`;

    const historyText = recentMessages
      .reverse()
      .map((m) => `${m.role === 'user' ? 'Student' : 'Advisor'}: ${m.content}`)
      .join('\n');

    const prompt = historyText
      ? `Oldingi suhbat:\n${historyText}\n\nYangi savol: ${message}`
      : message;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text?.trim();
    if (!replyText) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    await db.transaction(async (tx) => {
      await tx.insert(advisorMessages).values([
        { userId, role: 'user', content: message },
        { userId, role: 'assistant', content: replyText },
      ]);
    });

    return replyText;
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_UNAVAILABLE') {
      throw error;
    }
    console.error('Gemini advisor generation error:', error);
    throw new Error('AI_SERVICE_ERROR', { cause: error });
  }
}
