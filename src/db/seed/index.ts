import { sql } from 'drizzle-orm';
import { db } from '../index.ts';
import {
  answerOptions,
  careerCategories,
  careers,
  learningRoadmaps,
  questions,
  testCategories,
  tests,
} from '../schema.ts';
import { CATEGORIES_PART_1 } from './questions_part1.ts';
import { CATEGORIES_PART_2 } from './questions_part2.ts';
import { CAREER_CATEGORIES, CAREERS_SEED } from './careers.ts';

let seedPromise: Promise<void> | null = null;
let seededVerified = false;

export async function ensureSeeded(): Promise<void> {
  if (seededVerified) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const [{ count: catCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(testCategories);

      const [{ count: careerCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(careers);

      if (catCount >= 8 && careerCount >= 12) {
        seededVerified = true;
        return;
      }

      await db.transaction(async (tx) => {
        // Re-check inside transaction in case of concurrent startup requests
        const [{ count: txCatCount }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(testCategories);

        if (txCatCount < 8) {
          const allCategories = [...CATEGORIES_PART_1, ...CATEGORIES_PART_2];
          for (const cat of allCategories) {
            const [insertedCat] = await tx
              .insert(testCategories)
              .values({
                slug: cat.slug,
                titleUz: cat.titleUz,
                titleRu: cat.titleRu,
                titleEn: cat.titleEn,
                descriptionUz: cat.descriptionUz,
                descriptionRu: cat.descriptionRu,
                descriptionEn: cat.descriptionEn,
                measurementType: cat.measurementType,
                iconKey: cat.iconKey,
                accentColor: cat.accentColor,
                sortOrder: cat.sortOrder,
              })
              .onConflictDoNothing({ target: testCategories.slug })
              .returning();

            let catId = insertedCat?.id;
            if (!catId) {
              const existing = await tx.query.testCategories.findFirst({
                where: (c, { eq }) => eq(c.slug, cat.slug),
              });
              catId = existing!.id;
            }

            const [insertedTest] = await tx
              .insert(tests)
              .values({
                categoryId: catId,
                slug: cat.testSlug,
                titleUz: cat.testTitleUz,
                titleRu: cat.testTitleRu,
                titleEn: cat.testTitleEn,
                instructionsUz: cat.instructionsUz,
                instructionsRu: cat.instructionsRu,
                instructionsEn: cat.instructionsEn,
                estimatedMinutes: cat.estimatedMinutes,
                questionCount: cat.questions.length,
                isActive: true,
              })
              .onConflictDoNothing({ target: tests.slug })
              .returning();

            if (insertedTest) {
              for (const q of cat.questions) {
                const [insertedQ] = await tx
                  .insert(questions)
                  .values({
                    testId: insertedTest.id,
                    orderIndex: q.orderIndex,
                    questionType: q.questionType,
                    difficulty: q.difficulty,
                    skillDimension: q.skillDimension,
                    promptUz: q.promptUz,
                    promptRu: q.promptRu,
                    promptEn: q.promptEn,
                    explanationUz: q.explanationUz,
                    explanationRu: q.explanationRu,
                    explanationEn: q.explanationEn,
                    maxScore: q.maxScore,
                  })
                  .returning();

                await tx.insert(answerOptions).values(
                  q.options.map((opt) => ({
                    questionId: insertedQ.id,
                    optionKey: opt.optionKey,
                    textUz: opt.textUz,
                    textRu: opt.textRu,
                    textEn: opt.textEn,
                    isCorrect: opt.isCorrect,
                    scoreWeight: opt.scoreWeight,
                    traitTag: opt.traitTag ?? null,
                  }))
                );
              }
            }
          }
        }

        const [{ count: txCareerCount }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(careers);

        if (txCareerCount < 12) {
          const categoryIdBySlug = new Map<string, number>();

          for (const cc of CAREER_CATEGORIES) {
            const [inserted] = await tx
              .insert(careerCategories)
              .values({
                slug: cc.slug,
                nameUz: cc.nameUz,
                nameRu: cc.nameRu,
                nameEn: cc.nameEn,
                descriptionUz: cc.descriptionUz,
                descriptionRu: cc.descriptionRu,
                descriptionEn: cc.descriptionEn,
              })
              .onConflictDoNothing({ target: careerCategories.slug })
              .returning();

            if (inserted) {
              categoryIdBySlug.set(cc.slug, inserted.id);
            } else {
              const existing = await tx.query.careerCategories.findFirst({
                where: (c, { eq }) => eq(c.slug, cc.slug),
              });
              if (existing) categoryIdBySlug.set(cc.slug, existing.id);
            }
          }

          for (const c of CAREERS_SEED) {
            const careerCategoryId = categoryIdBySlug.get(c.categorySlug);
            if (!careerCategoryId) continue;

            const [insertedCareer] = await tx
              .insert(careers)
              .values({
                careerCategoryId,
                slug: c.slug,
                titleUz: c.titleUz,
                titleRu: c.titleRu,
                titleEn: c.titleEn,
                descriptionUz: c.descriptionUz,
                descriptionRu: c.descriptionRu,
                descriptionEn: c.descriptionEn,
                requiredAbilitiesJson: c.requiredAbilitiesJson,
                relevantSubjectsJson: c.relevantSubjectsJson,
                educationPathwaysJson: c.educationPathwaysJson,
                necessarySkillsJson: c.necessarySkillsJson,
                relatedCareersJson: c.relatedCareersJson,
                weightProfileJson: c.weightProfileJson,
                outlookNoteUz: c.outlookNoteUz,
                outlookNoteRu: c.outlookNoteRu,
                outlookNoteEn: c.outlookNoteEn,
              })
              .onConflictDoNothing({ target: careers.slug })
              .returning();

            if (insertedCareer) {
              await tx.insert(learningRoadmaps).values(
                c.roadmapSteps.map((step) => ({
                  careerId: insertedCareer.id,
                  stepOrder: step.stepOrder,
                  phaseLabel: step.phaseLabel,
                  titleUz: step.titleUz,
                  titleRu: step.titleRu,
                  titleEn: step.titleEn,
                  descriptionUz: step.descriptionUz,
                  descriptionRu: step.descriptionRu,
                  descriptionEn: step.descriptionEn,
                  estimatedWeeks: step.estimatedWeeks,
                  resourcesJson: step.resourcesJson,
                }))
              );
            }
          }
        }
      });

      seededVerified = true;
    } catch (error) {
      console.error('Database seed check failed:', error);
      throw new Error('Failed to initialize assessment catalog.', { cause: error });
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
