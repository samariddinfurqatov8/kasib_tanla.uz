import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  answerOptions,
  questions,
  skillScores,
  testAttempts,
  testCategories,
  testResults,
  tests,
  userAnswers,
} from '../db/schema.ts';
import { recomputeCareerRecommendations } from './recommendationEngine.ts';

export async function submitAttemptAndComputeResult(params: {
  userId: number;
  attemptId: number;
  elapsedSeconds?: number;
}) {
  const { userId, attemptId, elapsedSeconds } = params;

  try {
    const attempt = await db.query.testAttempts.findFirst({
      where: and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)),
    });

    if (!attempt) {
      throw new Error('NOT_FOUND');
    }

    // Prevent duplicate grading if already submitted
    if (attempt.status === 'completed') {
      const existingResult = await db.query.testResults.findFirst({
        where: eq(testResults.attemptId, attemptId),
      });
      if (existingResult) {
        return existingResult;
      }
    }

    const testRow = await db.query.tests.findFirst({
      where: eq(tests.id, attempt.testId),
    });
    if (!testRow) throw new Error('TEST_NOT_FOUND');

    const categoryRow = await db.query.testCategories.findFirst({
      where: eq(testCategories.id, testRow.categoryId),
    });
    if (!categoryRow) throw new Error('CATEGORY_NOT_FOUND');

    const testQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.testId, testRow.id));

    const questionIds = testQuestions.map((q) => q.id);
    const allOptions =
      questionIds.length > 0
        ? await db
            .select()
            .from(answerOptions)
            .where(inArray(answerOptions.questionId, questionIds))
        : [];

    const optionsById = new Map<number, (typeof allOptions)[number]>();
    for (const opt of allOptions) {
      optionsById.set(opt.id, opt);
    }

    const savedAnswers = await db
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.attemptId, attemptId));

    const answerByQuestion = new Map<number, (typeof savedAnswers)[number]>();
    for (const ans of savedAnswers) {
      answerByQuestion.set(ans.questionId, ans);
    }

    let rawScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    const traitCounts: Record<string, number> = {};
    const traitMaxPossible: Record<string, number> = {};

    // Track RIASEC trait appearances across all options of interest test
    if (categoryRow.measurementType === 'interest') {
      for (const opt of allOptions) {
        if (opt.traitTag) {
          traitMaxPossible[opt.traitTag] =
            (traitMaxPossible[opt.traitTag] ?? 0) + opt.scoreWeight;
        }
      }
    }

    const updates: Array<{
      answerId: number;
      isCorrect: boolean | null;
      pointsEarned: number;
    }> = [];

    for (const q of testQuestions) {
      maxScore += q.maxScore;
      const ans = answerByQuestion.get(q.id);
      if (!ans || !ans.selectedOptionId) continue;

      const selectedOpt = optionsById.get(ans.selectedOptionId);
      if (!selectedOpt || selectedOpt.questionId !== q.id) continue;

      let isCorrect: boolean | null = null;
      let points = 0;

      if (q.questionType === 'rubric_interest') {
        points = selectedOpt.scoreWeight;
        rawScore += points;
        if (selectedOpt.traitTag) {
          traitCounts[selectedOpt.traitTag] =
            (traitCounts[selectedOpt.traitTag] ?? 0) + selectedOpt.scoreWeight;
        }
      } else if (categoryRow.slug === 'creativity') {
        points = selectedOpt.scoreWeight;
        rawScore += points;
        isCorrect = selectedOpt.isCorrect;
        if (selectedOpt.isCorrect) correctCount += 1;
        if (selectedOpt.traitTag) {
          traitCounts[selectedOpt.traitTag] = (traitCounts[selectedOpt.traitTag] ?? 0) + 1;
        }
      } else {
        isCorrect = selectedOpt.isCorrect;
        points = selectedOpt.isCorrect ? q.maxScore : 0;
        rawScore += points;
        if (selectedOpt.isCorrect) correctCount += 1;
      }

      updates.push({
        answerId: ans.id,
        isCorrect,
        pointsEarned: points,
      });
    }

    const percentageScore =
      maxScore > 0 ? Math.round((rawScore / maxScore) * 1000) / 10 : 0;

    // Normalize RIASEC breakdown to 0-100 percentages per trait
    const traitBreakdown: Record<string, number> = {};
    if (categoryRow.measurementType === 'interest') {
      const riasecCodes = ['R', 'I', 'A', 'S', 'E', 'C'];
      for (const code of riasecCodes) {
        const earned = traitCounts[code] ?? 0;
        const possible = traitMaxPossible[code] ?? 0;
        traitBreakdown[code] =
          possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0;
      }
    } else {
      for (const [k, v] of Object.entries(traitCounts)) {
        traitBreakdown[k] = v;
      }
    }

    let summaryText = '';
    if (categoryRow.measurementType === 'interest') {
      const topTraits = Object.entries(traitBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([code, pct]) => `${code}: ${pct}%`);
      summaryText = `RIASEC qiziqishlar profili shakllantirildi. Yetakchi yo‘nalishlar: ${topTraits.join(', ')}.`;
    } else if (percentageScore >= 80) {
      summaryText = `${categoryRow.titleUz} bo‘yicha yuqori natija (${percentageScore}%). Bu yo‘nalishda kuchli poydevor ko‘rsatildi.`;
    } else if (percentageScore >= 55) {
      summaryText = `${categoryRow.titleUz} bo‘yicha o‘rta-yuqori natija (${percentageScore}%). Asosiy tushunchalar o‘zlashtirilgan, murakkab masalalarda mashq foydali.`;
    } else {
      summaryText = `${categoryRow.titleUz} bo‘yicha boshlang‘ich natija (${percentageScore}%). Bosqichma-bosqich mashg‘ulotlar bilan ko‘rsatkichni oshirish mumkin.`;
    }

    const primarySkillKey = categoryRow.slug.replace(/-/g, '_');

    const insertedResult = await db.transaction(async (tx) => {
      for (const u of updates) {
        await tx
          .update(userAnswers)
          .set({
            isCorrect: u.isCorrect,
            pointsEarned: u.pointsEarned,
          })
          .where(eq(userAnswers.id, u.answerId));
      }

      await tx
        .update(testAttempts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          elapsedSeconds:
            typeof elapsedSeconds === 'number' && elapsedSeconds >= 0
              ? elapsedSeconds
              : attempt.elapsedSeconds,
        })
        .where(eq(testAttempts.id, attemptId));

      const [resRow] = await tx
        .insert(testResults)
        .values({
          attemptId,
          userId,
          testId: testRow.id,
          categoryId: categoryRow.id,
          measurementType: categoryRow.measurementType,
          rawScore,
          maxScore,
          percentageScore,
          correctCount,
          totalQuestions: testQuestions.length,
          summaryText,
          traitBreakdownJson: traitBreakdown,
        })
        .onConflictDoNothing({ target: testResults.attemptId })
        .returning();

      const existingCountRes = await tx
        .select()
        .from(testResults)
        .where(
          and(
            eq(testResults.userId, userId),
            eq(testResults.categoryId, categoryRow.id)
          )
        );

      await tx
        .insert(skillScores)
        .values({
          userId,
          skillKey: primarySkillKey,
          measurementType: categoryRow.measurementType,
          scorePercentage: percentageScore,
          attemptsCount: existingCountRes.length,
          lastAttemptId: attemptId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [skillScores.userId, skillScores.skillKey],
          set: {
            scorePercentage: percentageScore,
            attemptsCount: existingCountRes.length,
            lastAttemptId: attemptId,
            updatedAt: new Date(),
          },
        });

      if (categoryRow.measurementType === 'interest') {
        for (const [code, pct] of Object.entries(traitBreakdown)) {
          const rKey = `riasec_${code.toLowerCase()}`;
          await tx
            .insert(skillScores)
            .values({
              userId,
              skillKey: rKey,
              measurementType: 'interest',
              scorePercentage: pct,
              attemptsCount: existingCountRes.length,
              lastAttemptId: attemptId,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [skillScores.userId, skillScores.skillKey],
              set: {
                scorePercentage: pct,
                attemptsCount: existingCountRes.length,
                lastAttemptId: attemptId,
                updatedAt: new Date(),
              },
            });
        }
      }

      if (resRow) return resRow;
      return (await tx.query.testResults.findFirst({
        where: eq(testResults.attemptId, attemptId),
      }))!;
    });

    await recomputeCareerRecommendations(userId);
    return insertedResult;
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw error;
    }
    console.error('Assessment grading failed:', error);
    throw new Error('Failed to grade and persist test attempt.', { cause: error });
  }
}
