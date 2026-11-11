import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './src/db/index.ts';
import {
  advisorMessages,
  answerOptions,
  careerCategories,
  careerRecommendations,
  careers,
  learningRoadmaps,
  questions,
  skillScores,
  testAttempts,
  testCategories,
  testResults,
  tests,
  userAnswers,
  userProfiles,
  userProgress,
  userSettings,
  users,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed/index.ts';
import {
  type AuthRequest,
  clearSessionCookie,
  findUserByIdentifier,
  hashPassword,
  hashSecretToken,
  requireAuth,
  setSessionCookie,
  signSessionToken,
  upsertFirebaseUser,
  verifyPassword,
} from './src/server/auth.ts';
import { adminAuth } from './src/server/firebaseAdmin.ts';
import { submitAttemptAndComputeResult } from './src/server/assessmentEngine.ts';
import { recomputeCareerRecommendations } from './src/server/recommendationEngine.ts';
import { generateAdvisorReply } from './src/server/geminiAdvisor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kasb-tanla-api' });
});

// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  identifier: z.string().trim().min(5).max(150),
  password: z.string().min(6).max(128),
  schoolGrade: z.coerce.number().int().min(5).max(12),
  schoolName: z.string().trim().max(160).optional().nullable(),
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Ma’lumotlar noto‘g‘ri kiritilgan. Iltimos, barcha majburiy maydonlarni tekshiring.',
    });
  }

  const { fullName, identifier, password, schoolGrade, schoolName } = parsed.data;
  const isEmail = identifier.includes('@');
  const email = isEmail ? identifier.toLowerCase() : null;
  const phone = !isEmail ? identifier.replace(/[\s()-]/g, '') : null;

  if (!email && (!phone || phone.length < 7)) {
    return res.status(400).json({
      error: 'To‘g‘ri email manzil yoki telefon raqamini kiriting.',
    });
  }

  try {
    const existing = await findUserByIdentifier(identifier);
    if (existing) {
      return res.status(409).json({
        error: 'Ushbu email yoki telefon raqami allaqachon ro‘yxatdan o‘tgan.',
      });
    }

    const uid = `local_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);

    const created = await db.transaction(async (tx) => {
      const [userRow] = await tx
        .insert(users)
        .values({
          uid,
          email,
          phone,
          passwordHash,
          authProvider: 'password',
        })
        .returning();

      const [profileRow] = await tx
        .insert(userProfiles)
        .values({
          userId: userRow.id,
          fullName,
          schoolGrade,
          schoolName: schoolName && schoolName.length > 0 ? schoolName : null,
          onboardingCompleted: true,
        })
        .returning();

      const [settingsRow] = await tx
        .insert(userSettings)
        .values({
          userId: userRow.id,
          language: 'uz',
          theme: 'dark',
        })
        .returning();

      return { userRow, profileRow, settingsRow };
    });

    const token = signSessionToken(created.userRow.id, created.userRow.uid);
    setSessionCookie(res, token);

    return res.status(201).json({
      user: {
        id: created.userRow.id,
        uid: created.userRow.uid,
        email: created.userRow.email,
        phone: created.userRow.phone,
        authProvider: created.userRow.authProvider,
      },
      profile: created.profileRow,
      settings: created.settingsRow,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Ro‘yxatdan o‘tishda server xatoligi yuz berdi.' });
  }
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(150),
  password: z.string().min(1).max(128),
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email/telefon va parolni kiriting.' });
  }

  try {
    const userRow = await findUserByIdentifier(parsed.data.identifier);
    if (!userRow || !userRow.passwordHash) {
      return res.status(401).json({
        error: 'Login yoki parol noto‘g‘ri.',
      });
    }

    const ok = verifyPassword(parsed.data.password, userRow.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' });
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userRow.id),
    });
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userRow.id),
    });

    const token = signSessionToken(userRow.id, userRow.uid);
    setSessionCookie(res, token);

    return res.json({
      user: {
        id: userRow.id,
        uid: userRow.uid,
        email: userRow.email,
        phone: userRow.phone,
        authProvider: userRow.authProvider,
      },
      profile,
      settings,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Tizimga kirishda xatolik yuz berdi.' });
  }
});

app.post('/api/auth/firebase', async (req, res) => {
  const authHeader = req.headers.authorization;
  const bodyToken = typeof req.body?.idToken === 'string' ? req.body.idToken : null;
  const idToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : bodyToken;

  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID token topilmadi.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userRow = await upsertFirebaseUser({
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: typeof decoded.name === 'string' ? decoded.name : null,
    });

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userRow.id),
    });
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userRow.id),
    });

    const sessionToken = signSessionToken(userRow.id, userRow.uid);
    setSessionCookie(res, sessionToken);

    return res.json({
      user: {
        id: userRow.id,
        uid: userRow.uid,
        email: userRow.email,
        phone: userRow.phone,
        authProvider: userRow.authProvider,
      },
      profile,
      settings,
      token: sessionToken,
    });
  } catch (error) {
    console.error('Firebase auth verification failed:', error);
    return res.status(401).json({ error: 'Google hisobini tasdiqlab bo‘lmadi.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

const recoverRequestSchema = z.object({
  identifier: z.string().trim().min(5).max(150),
});

app.post('/api/auth/recover/request', async (req, res) => {
  const parsed = recoverRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email yoki telefon raqamini kiriting.' });
  }

  try {
    const userRow = await findUserByIdentifier(parsed.data.identifier);
    if (!userRow) {
      return res.status(404).json({
        error: 'Ushbu email yoki telefon raqami bilan hisob topilmadi.',
      });
    }
    if (userRow.authProvider === 'google' && !userRow.passwordHash) {
      return res.status(400).json({
        error: 'Bu hisob Google orqali yaratilgan. Iltimos, "Google bilan kirish" tugmasidan foydalaning.',
      });
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashSecretToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db
      .update(users)
      .set({
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id));

    return res.json({
      ok: true,
      message: 'Hisob topildi. Shaxsni tasdiqlash uchun ism-familiya va sinfingizni kiriting.',
    });
  } catch (error) {
    console.error('Recovery request error:', error);
    return res.status(500).json({ error: 'Tiklash so‘rovida xatolik yuz berdi.' });
  }
});

const recoverResetSchema = z.object({
  identifier: z.string().trim().min(5).max(150),
  fullName: z.string().trim().min(2).max(120),
  schoolGrade: z.coerce.number().int().min(5).max(12),
  newPassword: z.string().min(6).max(128),
});

app.post('/api/auth/recover/reset', async (req, res) => {
  const parsed = recoverResetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Barcha maydonlarni to‘g‘ri to‘ldiring.' });
  }

  try {
    const userRow = await findUserByIdentifier(parsed.data.identifier);
    if (!userRow || !userRow.resetTokenExpiresAt || userRow.resetTokenExpiresAt < new Date()) {
      return res.status(400).json({
        error: 'Tiklash sessiyasi topilmadi yoki muddati tugagan. Qaytadan urinib ko‘ring.',
      });
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userRow.id),
    });

    if (
      !profile ||
      profile.fullName.trim().toLowerCase() !== parsed.data.fullName.trim().toLowerCase() ||
      profile.schoolGrade !== parsed.data.schoolGrade
    ) {
      return res.status(403).json({
        error: 'Kiritilgan ism-familiya yoki sinf ro‘yxatdagi ma’lumotga mos kelmadi.',
      });
    }

    const newHash = hashPassword(parsed.data.newPassword);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userRow.id));

    return res.json({ ok: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Parolni yangilashda xatolik yuz berdi.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authUser!.id;
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    res.json({
      user: req.authUser,
      profile,
      settings,
    });
  } catch (error) {
    console.error('Error fetching /api/auth/me:', error);
    res.status(500).json({ error: 'Foydalanuvchi ma’lumotlarini yuklab bo‘lmadi.' });
  }
});

// ---------------------------------------------------------------------------
// Profile & Settings Routes
// ---------------------------------------------------------------------------
const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  schoolGrade: z.coerce.number().int().min(5).max(12),
  schoolName: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  bio: z.string().trim().max(600).optional().nullable(),
  interestsText: z.string().trim().max(500).optional().nullable(),
});

app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Profil maydonlarini to‘g‘ri kiriting.' });
  }

  try {
    const userId = req.authUser!.id;
    const [updated] = await db
      .insert(userProfiles)
      .values({
        userId,
        fullName: parsed.data.fullName,
        schoolGrade: parsed.data.schoolGrade,
        schoolName: parsed.data.schoolName || null,
        city: parsed.data.city || null,
        bio: parsed.data.bio || null,
        interestsText: parsed.data.interestsText || null,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          fullName: parsed.data.fullName,
          schoolGrade: parsed.data.schoolGrade,
          schoolName: parsed.data.schoolName || null,
          city: parsed.data.city || null,
          bio: parsed.data.bio || null,
          interestsText: parsed.data.interestsText || null,
          onboardingCompleted: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ profile: updated });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Profilni saqlab bo‘lmadi.' });
  }
});

const settingsUpdateSchema = z.object({
  language: z.enum(['uz', 'ru', 'en']).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  emailNotifications: z.boolean().optional(),
  showExplanationsAfterSubmit: z.boolean().optional(),
});

app.get('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, req.authUser!.id),
    });
    res.json({ settings });
  } catch (error) {
    console.error('Settings fetch failed:', error);
    res.status(500).json({ error: 'Sozlamalarni olishda xatolik.' });
  }
});

app.put('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  const parsed = settingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Noto‘g‘ri sozlama qiymatlari.' });
  }

  try {
    const userId = req.authUser!.id;
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    const [updated] = await db
      .insert(userSettings)
      .values({
        userId,
        language: parsed.data.language ?? existing?.language ?? 'uz',
        theme: parsed.data.theme ?? existing?.theme ?? 'dark',
        emailNotifications:
          parsed.data.emailNotifications ?? existing?.emailNotifications ?? true,
        showExplanationsAfterSubmit:
          parsed.data.showExplanationsAfterSubmit ??
          existing?.showExplanationsAfterSubmit ??
          true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          language: parsed.data.language ?? existing?.language ?? 'uz',
          theme: parsed.data.theme ?? existing?.theme ?? 'dark',
          emailNotifications:
            parsed.data.emailNotifications ?? existing?.emailNotifications ?? true,
          showExplanationsAfterSubmit:
            parsed.data.showExplanationsAfterSubmit ??
            existing?.showExplanationsAfterSubmit ??
            true,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ settings: updated });
  } catch (error) {
    console.error('Settings update failed:', error);
    res.status(500).json({ error: 'Sozlamalarni saqlab bo‘lmadi.' });
  }
});

// ---------------------------------------------------------------------------
// Assessment Categories, Tests, Attempts & Grading
// ---------------------------------------------------------------------------
app.get('/api/assessments/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const userId = req.authUser!.id;

    const categories = await db
      .select()
      .from(testCategories)
      .orderBy(asc(testCategories.sortOrder));

    const allTests = await db.select().from(tests);
    const userAttempts = await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.startedAt));

    const userResults = await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt));

    const attemptAnswers =
      userAttempts.length > 0
        ? await db
            .select()
            .from(userAnswers)
            .where(
              inArray(
                userAnswers.attemptId,
                userAttempts.map((a) => a.id)
              )
            )
        : [];

    const answerCountByAttempt = new Map<number, number>();
    for (const ans of attemptAnswers) {
      if (ans.selectedOptionId) {
        answerCountByAttempt.set(
          ans.attemptId,
          (answerCountByAttempt.get(ans.attemptId) ?? 0) + 1
        );
      }
    }

    const enriched = categories.map((cat) => {
      const test = allTests.find((t) => t.categoryId === cat.id) ?? null;
      const activeAttempt = test
        ? userAttempts.find(
            (a) => a.testId === test.id && a.status === 'in_progress'
          ) ?? null
        : null;
      const latestResult =
        userResults.find((r) => r.categoryId === cat.id) ?? null;
      const completedCount = userResults.filter(
        (r) => r.categoryId === cat.id
      ).length;

      return {
        category: cat,
        test,
        activeAttempt: activeAttempt
          ? {
              ...activeAttempt,
              answeredCount: answerCountByAttempt.get(activeAttempt.id) ?? 0,
            }
          : null,
        latestResult,
        completedCount,
      };
    });

    res.json({ categories: enriched });
  } catch (error) {
    console.error('Failed to load assessment categories:', error);
    res.status(500).json({ error: 'Test kategoriyalarini yuklab bo‘lmadi.' });
  }
});

// Public preview of categories for Landing page (without user attempt info)
app.get('/api/public/categories', async (_req, res) => {
  try {
    await ensureSeeded();
    const categories = await db
      .select()
      .from(testCategories)
      .orderBy(asc(testCategories.sortOrder));
    res.json({ categories });
  } catch (error) {
    console.error('Failed to load public categories:', error);
    res.status(500).json({ error: 'Kategoriyalarni yuklab bo‘lmadi.' });
  }
});

app.post('/api/assessments/tests/:testId/start', requireAuth, async (req: AuthRequest, res) => {
  const testId = Number(req.params.testId);
  if (!Number.isInteger(testId) || testId <= 0) {
    return res.status(400).json({ error: 'Noto‘g‘ri test identifikatori.' });
  }

  try {
    await ensureSeeded();
    const userId = req.authUser!.id;
    const forceNew = Boolean(req.body?.forceNew);

    const testRow = await db.query.tests.findFirst({
      where: eq(tests.id, testId),
    });
    if (!testRow) {
      return res.status(404).json({ error: 'Test topilmadi.' });
    }

    let attempt = await db.query.testAttempts.findFirst({
      where: and(
        eq(testAttempts.userId, userId),
        eq(testAttempts.testId, testId),
        eq(testAttempts.status, 'in_progress')
      ),
    });

    if (attempt && forceNew) {
      await db.delete(testAttempts).where(eq(testAttempts.id, attempt.id));
      attempt = undefined;
    }

    if (!attempt) {
      const [created] = await db
        .insert(testAttempts)
        .values({
          userId,
          testId,
          status: 'in_progress',
          currentQuestionIndex: 0,
          elapsedSeconds: 0,
        })
        .returning();
      attempt = created;
    }

    return res.json({ attemptId: attempt.id, attempt });
  } catch (error) {
    console.error('Failed to start test attempt:', error);
    res.status(500).json({ error: 'Testni boshlashda xatolik yuz berdi.' });
  }
});

app.get('/api/assessments/attempts/:attemptId', requireAuth, async (req: AuthRequest, res) => {
  const attemptId = Number(req.params.attemptId);
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ error: 'Noto‘g‘ri urinish identifikatori.' });
  }

  try {
    const userId = req.authUser!.id;
    const attempt = await db.query.testAttempts.findFirst({
      where: and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)),
    });
    if (!attempt) {
      return res.status(404).json({ error: 'Test urinishi topilmadi.' });
    }

    const testRow = await db.query.tests.findFirst({
      where: eq(tests.id, attempt.testId),
    });
    const categoryRow = testRow
      ? await db.query.testCategories.findFirst({
          where: eq(testCategories.id, testRow.categoryId),
        })
      : null;

    const testQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.testId, attempt.testId))
      .orderBy(asc(questions.orderIndex));

    const qIds = testQuestions.map((q) => q.id);
    const optionsRows =
      qIds.length > 0
        ? await db
            .select()
            .from(answerOptions)
            .where(inArray(answerOptions.questionId, qIds))
            .orderBy(asc(answerOptions.optionKey))
        : [];

    const savedAnswers = await db
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.attemptId, attemptId));

    const isCompleted = attempt.status === 'completed';

    // NEVER leak isCorrect, scoreWeight, or explanation while test is active!
    const sanitizedQuestions = testQuestions.map((q) => ({
      id: q.id,
      orderIndex: q.orderIndex,
      questionType: q.questionType,
      difficulty: q.difficulty,
      skillDimension: q.skillDimension,
      promptUz: q.promptUz,
      promptRu: q.promptRu,
      promptEn: q.promptEn,
      ...(isCompleted
        ? {
            explanationUz: q.explanationUz,
            explanationRu: q.explanationRu,
            explanationEn: q.explanationEn,
          }
        : {}),
      options: optionsRows
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          optionKey: o.optionKey,
          textUz: o.textUz,
          textRu: o.textRu,
          textEn: o.textEn,
          ...(isCompleted ? { isCorrect: o.isCorrect, traitTag: o.traitTag } : {}),
        })),
    }));

    res.json({
      attempt,
      test: testRow,
      category: categoryRow,
      questions: sanitizedQuestions,
      answers: savedAnswers.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        ...(isCompleted
          ? { isCorrect: a.isCorrect, pointsEarned: a.pointsEarned }
          : {}),
      })),
    });
  } catch (error) {
    console.error('Failed to load test attempt:', error);
    res.status(500).json({ error: 'Test savollarini yuklab bo‘lmadi.' });
  }
});

const saveAnswerSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  selectedOptionId: z.coerce.number().int().positive(),
  currentQuestionIndex: z.coerce.number().int().min(0).max(200).optional(),
  elapsedSeconds: z.coerce.number().int().min(0).max(86400).optional(),
});

app.post(
  '/api/assessments/attempts/:attemptId/answer',
  requireAuth,
  async (req: AuthRequest, res) => {
    const attemptId = Number(req.params.attemptId);
    const parsed = saveAnswerSchema.safeParse(req.body);
    if (!Number.isInteger(attemptId) || attemptId <= 0 || !parsed.success) {
      return res.status(400).json({ error: 'Noto‘g‘ri javob ma’lumoti.' });
    }

    try {
      const userId = req.authUser!.id;
      const attempt = await db.query.testAttempts.findFirst({
        where: and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.userId, userId)
        ),
      });

      if (!attempt) {
        return res.status(404).json({ error: 'Urinish topilmadi.' });
      }
      if (attempt.status === 'completed') {
        return res.status(409).json({
          error: 'Bu test allaqachon yakunlangan, javoblarni o‘zgartirib bo‘lmaydi.',
        });
      }

      const questionRow = await db.query.questions.findFirst({
        where: and(
          eq(questions.id, parsed.data.questionId),
          eq(questions.testId, attempt.testId)
        ),
      });
      if (!questionRow) {
        return res.status(400).json({ error: 'Savol ushbu testga tegishli emas.' });
      }

      const optionRow = await db.query.answerOptions.findFirst({
        where: and(
          eq(answerOptions.id, parsed.data.selectedOptionId),
          eq(answerOptions.questionId, questionRow.id)
        ),
      });
      if (!optionRow) {
        return res.status(400).json({ error: 'Tanlangan variant ushbu savolga tegishli emas.' });
      }

      await db.transaction(async (tx) => {
        await tx
          .insert(userAnswers)
          .values({
            attemptId,
            questionId: questionRow.id,
            selectedOptionId: optionRow.id,
            answeredAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [userAnswers.attemptId, userAnswers.questionId],
            set: {
              selectedOptionId: optionRow.id,
              answeredAt: new Date(),
            },
          });

        await tx
          .update(testAttempts)
          .set({
            currentQuestionIndex:
              parsed.data.currentQuestionIndex ?? attempt.currentQuestionIndex,
            elapsedSeconds: parsed.data.elapsedSeconds ?? attempt.elapsedSeconds,
          })
          .where(eq(testAttempts.id, attemptId));
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to auto-save answer:', error);
      res.status(500).json({ error: 'Javobni saqlashda xatolik.' });
    }
  }
);

app.post(
  '/api/assessments/attempts/:attemptId/submit',
  requireAuth,
  async (req: AuthRequest, res) => {
    const attemptId = Number(req.params.attemptId);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ error: 'Noto‘g‘ri urinish identifikatori.' });
    }

    try {
      const elapsedSeconds =
        typeof req.body?.elapsedSeconds === 'number'
          ? req.body.elapsedSeconds
          : undefined;

      const result = await submitAttemptAndComputeResult({
        userId: req.authUser!.id,
        attemptId,
        elapsedSeconds,
      });

      res.json({ result });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Test urinishi topilmadi.' });
      }
      console.error('Submit attempt failed:', error);
      res.status(500).json({ error: 'Test natijasini hisoblashda xatolik.' });
    }
  }
);

// ---------------------------------------------------------------------------
// Analytics, Results & History
// ---------------------------------------------------------------------------
app.get('/api/analytics/overview', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const userId = req.authUser!.id;

    const categories = await db
      .select()
      .from(testCategories)
      .orderBy(asc(testCategories.sortOrder));

    const userSkillRows = await db
      .select()
      .from(skillScores)
      .where(eq(skillScores.userId, userId));

    const attempts = await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.startedAt));

    const results = await db
      .select({
        id: testResults.id,
        attemptId: testResults.attemptId,
        testId: testResults.testId,
        categoryId: testResults.categoryId,
        measurementType: testResults.measurementType,
        rawScore: testResults.rawScore,
        maxScore: testResults.maxScore,
        percentageScore: testResults.percentageScore,
        correctCount: testResults.correctCount,
        totalQuestions: testResults.totalQuestions,
        summaryText: testResults.summaryText,
        traitBreakdownJson: testResults.traitBreakdownJson,
        createdAt: testResults.createdAt,
        categorySlug: testCategories.slug,
        categoryTitleUz: testCategories.titleUz,
        categoryTitleRu: testCategories.titleRu,
        categoryTitleEn: testCategories.titleEn,
        elapsedSeconds: testAttempts.elapsedSeconds,
      })
      .from(testResults)
      .innerJoin(testCategories, eq(testResults.categoryId, testCategories.id))
      .innerJoin(testAttempts, eq(testResults.attemptId, testAttempts.id))
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt));

    const completedCategoryIds = new Set(results.map((r) => r.categoryId));
    const overallAssessmentProgress = Math.round(
      (completedCategoryIds.size / Math.max(categories.length, 1)) * 100
    );

    const knowledgeScores = userSkillRows.filter(
      (s) => s.measurementType === 'knowledge'
    );
    const cognitiveScores = userSkillRows.filter(
      (s) => s.measurementType === 'cognitive'
    );
    const interestScores = userSkillRows.filter(
      (s) => s.skillKey.startsWith('riasec_')
    );

    const knowledgeAverage =
      knowledgeScores.length > 0
        ? Math.round(
            (knowledgeScores.reduce((sum, s) => sum + s.scorePercentage, 0) /
              knowledgeScores.length) *
              10
          ) / 10
        : null;

    const cognitiveAverage =
      cognitiveScores.length > 0
        ? Math.round(
            (cognitiveScores.reduce((sum, s) => sum + s.scorePercentage, 0) /
              cognitiveScores.length) *
              10
          ) / 10
        : null;

    const assessedMainSkills = userSkillRows.filter(
      (s) => !s.skillKey.startsWith('riasec_') && s.skillKey !== 'career_aptitude'
    );
    const sortedSkills = [...assessedMainSkills].sort(
      (a, b) => b.scorePercentage - a.scorePercentage
    );
    const strongestAreas = sortedSkills.filter((s) => s.scorePercentage >= 65).slice(0, 3);
    const improvementAreas = [...assessedMainSkills]
      .sort((a, b) => a.scorePercentage - b.scorePercentage)
      .filter((s) => s.scorePercentage < 75)
      .slice(0, 3);

    const totalElapsedSeconds = attempts.reduce(
      (sum, a) => sum + (a.elapsedSeconds ?? 0),
      0
    );

    res.json({
      overallProgressPct: overallAssessmentProgress,
      completedCategoriesCount: completedCategoryIds.size,
      totalCategoriesCount: categories.length,
      knowledgeAverage,
      cognitiveAverage,
      skillScores: userSkillRows,
      interestProfile: interestScores,
      strongestAreas,
      improvementAreas,
      completionStats: {
        totalAttempts: attempts.length,
        completedAttempts: attempts.filter((a) => a.status === 'completed').length,
        inProgressAttempts: attempts.filter((a) => a.status === 'in_progress').length,
        totalMinutesSpent: Math.round(totalElapsedSeconds / 60),
      },
      resultsHistory: results,
    });
  } catch (error) {
    console.error('Failed to compute analytics overview:', error);
    res.status(500).json({ error: 'Shaxsiy statistikani hisoblashda xatolik.' });
  }
});

app.get('/api/analytics/results/:attemptId', requireAuth, async (req: AuthRequest, res) => {
  const attemptId = Number(req.params.attemptId);
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return res.status(400).json({ error: 'Noto‘g‘ri urinish identifikatori.' });
  }

  try {
    const userId = req.authUser!.id;
    const resultRow = await db.query.testResults.findFirst({
      where: and(
        eq(testResults.attemptId, attemptId),
        eq(testResults.userId, userId)
      ),
    });
    if (!resultRow) {
      return res.status(404).json({ error: 'Test natijasi topilmadi.' });
    }

    const category = await db.query.testCategories.findFirst({
      where: eq(testCategories.id, resultRow.categoryId),
    });
    const testRow = await db.query.tests.findFirst({
      where: eq(tests.id, resultRow.testId),
    });
    const attempt = await db.query.testAttempts.findFirst({
      where: eq(testAttempts.id, attemptId),
    });
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    const previousResults = await db
      .select()
      .from(testResults)
      .where(
        and(
          eq(testResults.userId, userId),
          eq(testResults.categoryId, resultRow.categoryId)
        )
      )
      .orderBy(asc(testResults.createdAt));

    let reviewQuestions: Array<Record<string, unknown>> = [];
    if (settings?.showExplanationsAfterSubmit !== false) {
      const qRows = await db
        .select()
        .from(questions)
        .where(eq(questions.testId, resultRow.testId))
        .orderBy(asc(questions.orderIndex));

      const qIds = qRows.map((q) => q.id);
      const optRows =
        qIds.length > 0
          ? await db
              .select()
              .from(answerOptions)
              .where(inArray(answerOptions.questionId, qIds))
              .orderBy(asc(answerOptions.optionKey))
          : [];
      const ansRows = await db
        .select()
        .from(userAnswers)
        .where(eq(userAnswers.attemptId, attemptId));

      reviewQuestions = qRows.map((q) => {
        const ans = ansRows.find((a) => a.questionId === q.id);
        return {
          id: q.id,
          orderIndex: q.orderIndex,
          questionType: q.questionType,
          difficulty: q.difficulty,
          promptUz: q.promptUz,
          promptRu: q.promptRu,
          promptEn: q.promptEn,
          explanationUz: q.explanationUz,
          explanationRu: q.explanationRu,
          explanationEn: q.explanationEn,
          selectedOptionId: ans?.selectedOptionId ?? null,
          isCorrect: ans?.isCorrect ?? null,
          pointsEarned: ans?.pointsEarned ?? 0,
          options: optRows.filter((o) => o.questionId === q.id),
        };
      });
    }

    res.json({
      result: resultRow,
      category,
      test: testRow,
      attempt,
      previousAttemptsInCategory: previousResults,
      reviewQuestions,
    });
  } catch (error) {
    console.error('Failed to fetch attempt result:', error);
    res.status(500).json({ error: 'Natijani yuklab bo‘lmadi.' });
  }
});

// ---------------------------------------------------------------------------
// Career Catalog, Recommendations & Roadmap Progress
// ---------------------------------------------------------------------------
app.get('/api/careers', async (req, res) => {
  try {
    await ensureSeeded();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const categories = await db.select().from(careerCategories);
    const allCareers = await db.select().from(careers);
    const allRoadmaps = await db
      .select()
      .from(learningRoadmaps)
      .orderBy(asc(learningRoadmaps.stepOrder));

    const filtered = allCareers.filter((c) => {
      if (categorySlug) {
        const cat = categories.find((cc) => cc.id === c.careerCategoryId);
        if (!cat || cat.slug !== categorySlug) return false;
      }
      if (q) {
        const haystack = [
          c.titleUz,
          c.titleRu,
          c.titleEn,
          c.descriptionUz,
          c.descriptionRu,
          c.descriptionEn,
          ...c.relevantSubjectsJson,
          ...c.necessarySkillsJson,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const items = filtered.map((c) => ({
      ...c,
      category: categories.find((cc) => cc.id === c.careerCategoryId) ?? null,
      roadmap: allRoadmaps.filter((r) => r.careerId === c.id),
    }));

    res.json({ categories, careers: items });
  } catch (error) {
    console.error('Failed to fetch career catalog:', error);
    res.status(500).json({ error: 'Kasblar katalogini yuklab bo‘lmadi.' });
  }
});

app.get('/api/careers/recommendations', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const userId = req.authUser!.id;

    const recs = await db
      .select()
      .from(careerRecommendations)
      .where(eq(careerRecommendations.userId, userId))
      .orderBy(asc(careerRecommendations.rank));

    const allCareers = await db.select().from(careers);
    const allRoadmaps = await db
      .select()
      .from(learningRoadmaps)
      .orderBy(asc(learningRoadmaps.stepOrder));
    const userProg = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    const detailed = recs.map((r) => {
      const career = allCareers.find((c) => c.id === r.careerId) ?? null;
      const roadmap = allRoadmaps
        .filter((step) => step.careerId === r.careerId)
        .map((step) => {
          const prog = userProg.find((p) => p.roadmapStepId === step.id);
          return {
            ...step,
            progressStatus: prog?.status ?? 'not_started',
            notes: prog?.notes ?? null,
          };
        });
      return {
        recommendation: r,
        career,
        roadmap,
      };
    });

    res.json({ recommendations: detailed });
  } catch (error) {
    console.error('Failed to fetch career recommendations:', error);
    res.status(500).json({ error: 'Kasb tavsiyalarini olishda xatolik.' });
  }
});

app.post(
  '/api/careers/recommendations/recompute',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      await recomputeCareerRecommendations(req.authUser!.id);
      res.json({ ok: true });
    } catch (error) {
      console.error('Recommendation recompute failed:', error);
      res.status(500).json({ error: 'Tavsiyalarni qayta hisoblashda xatolik.' });
    }
  }
);

const progressSchema = z.object({
  roadmapStepId: z.coerce.number().int().positive(),
  careerId: z.coerce.number().int().positive(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  notes: z.string().trim().max(500).optional().nullable(),
});

app.put('/api/careers/progress', requireAuth, async (req: AuthRequest, res) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Noto‘g‘ri reja bosqichi holati.' });
  }

  try {
    const userId = req.authUser!.id;
    const { roadmapStepId, careerId, status, notes } = parsed.data;

    const [saved] = await db
      .insert(userProgress)
      .values({
        userId,
        roadmapStepId,
        careerId,
        status,
        notes: notes ?? null,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.roadmapStepId],
        set: {
          status,
          notes: notes ?? null,
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ progress: saved });
  } catch (error) {
    console.error('Failed to update roadmap progress:', error);
    res.status(500).json({ error: 'O‘quv reja holatini saqlab bo‘lmadi.' });
  }
});

// ---------------------------------------------------------------------------
// AI Career Advisor Routes
// ---------------------------------------------------------------------------
app.get('/api/advisor/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const messages = await db
      .select()
      .from(advisorMessages)
      .where(eq(advisorMessages.userId, req.authUser!.id))
      .orderBy(asc(advisorMessages.id));
    res.json({ messages });
  } catch (error) {
    console.error('Failed to fetch advisor messages:', error);
    res.status(500).json({ error: 'Suhbat tarixini yuklab bo‘lmadi.' });
  }
});

const advisorChatSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  language: z.enum(['uz', 'ru', 'en']).optional(),
});

app.post('/api/advisor/chat', requireAuth, async (req: AuthRequest, res) => {
  const parsed = advisorChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Iltimos, savolingizni kiriting (kamida 2 ta belgi).' });
  }

  try {
    const reply = await generateAdvisorReply({
      userId: req.authUser!.id,
      message: parsed.data.message,
      language: parsed.data.language,
    });
    res.json({ reply });
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_UNAVAILABLE') {
      return res.status(503).json({
        error:
          'AI maslahatchi hozircha faol emas (GEMINI_API_KEY sozlanmagan). Platformaning testlar, statistika va kasblar katalogi bo‘limlaridan odatdagidek foydalanishingiz mumkin.',
      });
    }
    return res.status(503).json({
      error:
        'AI xizmati bilan vaqtincha bog‘lanib bo‘lmadi. Iltimos, birozdan so‘ng qayta urinib ko‘ring.',
    });
  }
});

app.delete('/api/advisor/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(advisorMessages)
      .where(eq(advisorMessages.userId, req.authUser!.id));
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to clear advisor messages:', error);
    res.status(500).json({ error: 'Suhbat tarixini tozalab bo‘lmadi.' });
  }
});

// ---------------------------------------------------------------------------
// Frontend Hosting (Vite dev middleware or built dist/)
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`KASB TANLA server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
