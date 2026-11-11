import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. users
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').unique(),
    phone: text('phone').unique(),
    passwordHash: text('password_hash'),
    authProvider: text('auth_provider').notNull().default('password'),
    resetTokenHash: text('reset_token_hash'),
    resetTokenExpiresAt: timestamp('reset_token_expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_phone').on(table.phone),
  ]
);

// 2. user_profiles
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  fullName: text('full_name').notNull(),
  schoolGrade: integer('school_grade').notNull().default(9),
  schoolName: text('school_name'),
  city: text('city'),
  bio: text('bio'),
  interestsText: text('interests_text'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. test_categories
export const testCategories = pgTable('test_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleUz: text('title_uz').notNull(),
  titleRu: text('title_ru').notNull(),
  titleEn: text('title_en').notNull(),
  descriptionUz: text('description_uz').notNull(),
  descriptionRu: text('description_ru').notNull(),
  descriptionEn: text('description_en').notNull(),
  measurementType: text('measurement_type').notNull(), // 'knowledge' | 'cognitive' | 'interest'
  iconKey: text('icon_key').notNull(),
  accentColor: text('accent_color').notNull(),
  sortOrder: integer('sort_order').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. tests
export const tests = pgTable(
  'tests',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .references(() => testCategories.id, { onDelete: 'cascade' })
      .notNull(),
    slug: text('slug').notNull().unique(),
    titleUz: text('title_uz').notNull(),
    titleRu: text('title_ru').notNull(),
    titleEn: text('title_en').notNull(),
    instructionsUz: text('instructions_uz').notNull(),
    instructionsRu: text('instructions_ru').notNull(),
    instructionsEn: text('instructions_en').notNull(),
    estimatedMinutes: integer('estimated_minutes').notNull().default(15),
    questionCount: integer('question_count').notNull().default(20),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_tests_category_id').on(table.categoryId)]
);

// 5. questions
export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    testId: integer('test_id')
      .references(() => tests.id, { onDelete: 'cascade' })
      .notNull(),
    orderIndex: integer('order_index').notNull(),
    questionType: text('question_type').notNull().default('knowledge_mcq'), // 'knowledge_mcq' | 'cognitive_mcq' | 'rubric_interest'
    difficulty: text('difficulty').notNull().default('medium'), // 'easy' | 'medium' | 'hard'
    skillDimension: text('skill_dimension').notNull(),
    promptUz: text('prompt_uz').notNull(),
    promptRu: text('prompt_ru').notNull(),
    promptEn: text('prompt_en').notNull(),
    explanationUz: text('explanation_uz'),
    explanationRu: text('explanation_ru'),
    explanationEn: text('explanation_en'),
    maxScore: integer('max_score').notNull().default(1),
  },
  (table) => [
    index('idx_questions_test_id').on(table.testId),
    uniqueIndex('uq_questions_test_order').on(table.testId, table.orderIndex),
  ]
);

// 6. answer_options
export const answerOptions = pgTable(
  'answer_options',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .references(() => questions.id, { onDelete: 'cascade' })
      .notNull(),
    optionKey: text('option_key').notNull(), // 'A' | 'B' | 'C' | 'D'
    textUz: text('text_uz').notNull(),
    textRu: text('text_ru').notNull(),
    textEn: text('text_en').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    scoreWeight: integer('score_weight').notNull().default(0),
    traitTag: text('trait_tag'),
  },
  (table) => [index('idx_answer_options_question_id').on(table.questionId)]
);

// 7. test_attempts
export const testAttempts = pgTable(
  'test_attempts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    testId: integer('test_id')
      .references(() => tests.id, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed'
    currentQuestionIndex: integer('current_question_index').notNull().default(0),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    elapsedSeconds: integer('elapsed_seconds').notNull().default(0),
  },
  (table) => [
    index('idx_test_attempts_user_id').on(table.userId),
    index('idx_test_attempts_user_test_status').on(
      table.userId,
      table.testId,
      table.status
    ),
  ]
);

// 8. user_answers
export const userAnswers = pgTable(
  'user_answers',
  {
    id: serial('id').primaryKey(),
    attemptId: integer('attempt_id')
      .references(() => testAttempts.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: integer('question_id')
      .references(() => questions.id, { onDelete: 'cascade' })
      .notNull(),
    selectedOptionId: integer('selected_option_id').references(
      () => answerOptions.id,
      { onDelete: 'set null' }
    ),
    isCorrect: boolean('is_correct'),
    pointsEarned: integer('points_earned').notNull().default(0),
    answeredAt: timestamp('answered_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_answers_attempt_id').on(table.attemptId),
    uniqueIndex('uq_user_answers_attempt_question').on(
      table.attemptId,
      table.questionId
    ),
  ]
);

// 9. test_results
export const testResults = pgTable(
  'test_results',
  {
    id: serial('id').primaryKey(),
    attemptId: integer('attempt_id')
      .references(() => testAttempts.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    testId: integer('test_id')
      .references(() => tests.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: integer('category_id')
      .references(() => testCategories.id, { onDelete: 'cascade' })
      .notNull(),
    measurementType: text('measurement_type').notNull(),
    rawScore: integer('raw_score').notNull(),
    maxScore: integer('max_score').notNull(),
    percentageScore: real('percentage_score').notNull(),
    correctCount: integer('correct_count').notNull().default(0),
    totalQuestions: integer('total_questions').notNull(),
    summaryText: text('summary_text').notNull(),
    traitBreakdownJson: jsonb('trait_breakdown_json')
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_test_results_user_id').on(table.userId),
    index('idx_test_results_user_category').on(table.userId, table.categoryId),
  ]
);

// 10. skill_scores
export const skillScores = pgTable(
  'skill_scores',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    skillKey: text('skill_key').notNull(),
    measurementType: text('measurement_type').notNull(),
    scorePercentage: real('score_percentage').notNull(),
    attemptsCount: integer('attempts_count').notNull().default(1),
    lastAttemptId: integer('last_attempt_id').references(
      () => testAttempts.id,
      { onDelete: 'set null' }
    ),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_skill_scores_user_id').on(table.userId),
    uniqueIndex('uq_skill_scores_user_skill').on(table.userId, table.skillKey),
  ]
);

// 11. career_categories
export const careerCategories = pgTable('career_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameUz: text('name_uz').notNull(),
  nameRu: text('name_ru').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionUz: text('description_uz').notNull(),
  descriptionRu: text('description_ru').notNull(),
  descriptionEn: text('description_en').notNull(),
});

// 12. careers
export const careers = pgTable(
  'careers',
  {
    id: serial('id').primaryKey(),
    careerCategoryId: integer('career_category_id')
      .references(() => careerCategories.id, { onDelete: 'cascade' })
      .notNull(),
    slug: text('slug').notNull().unique(),
    titleUz: text('title_uz').notNull(),
    titleRu: text('title_ru').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionUz: text('description_uz').notNull(),
    descriptionRu: text('description_ru').notNull(),
    descriptionEn: text('description_en').notNull(),
    requiredAbilitiesJson: jsonb('required_abilities_json')
      .$type<string[]>()
      .notNull(),
    relevantSubjectsJson: jsonb('relevant_subjects_json')
      .$type<string[]>()
      .notNull(),
    educationPathwaysJson: jsonb('education_pathways_json')
      .$type<string[]>()
      .notNull(),
    necessarySkillsJson: jsonb('necessary_skills_json')
      .$type<string[]>()
      .notNull(),
    relatedCareersJson: jsonb('related_careers_json')
      .$type<string[]>()
      .notNull(),
    weightProfileJson: jsonb('weight_profile_json')
      .$type<Record<string, number>>()
      .notNull(),
    outlookNoteUz: text('outlook_note_uz').notNull(),
    outlookNoteRu: text('outlook_note_ru').notNull(),
    outlookNoteEn: text('outlook_note_en').notNull(),
  },
  (table) => [index('idx_careers_category_id').on(table.careerCategoryId)]
);

// 13. career_recommendations
export const careerRecommendations = pgTable(
  'career_recommendations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    careerId: integer('career_id')
      .references(() => careers.id, { onDelete: 'cascade' })
      .notNull(),
    rank: integer('rank').notNull(),
    matchScore: real('match_score').notNull(),
    academicMatchScore: real('academic_match_score').notNull(),
    cognitiveMatchScore: real('cognitive_match_score').notNull(),
    interestMatchScore: real('interest_match_score').notNull(),
    matchReasonUz: text('match_reason_uz').notNull(),
    matchReasonRu: text('match_reason_ru').notNull(),
    matchReasonEn: text('match_reason_en').notNull(),
    strengthsJson: jsonb('strengths_json').$type<string[]>().notNull(),
    skillsToDevelopJson: jsonb('skills_to_develop_json')
      .$type<string[]>()
      .notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_career_recs_user_id').on(table.userId),
    uniqueIndex('uq_career_recs_user_career').on(table.userId, table.careerId),
  ]
);

// 14. learning_roadmaps
export const learningRoadmaps = pgTable(
  'learning_roadmaps',
  {
    id: serial('id').primaryKey(),
    careerId: integer('career_id')
      .references(() => careers.id, { onDelete: 'cascade' })
      .notNull(),
    stepOrder: integer('step_order').notNull(),
    phaseLabel: text('phase_label').notNull(),
    titleUz: text('title_uz').notNull(),
    titleRu: text('title_ru').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionUz: text('description_uz').notNull(),
    descriptionRu: text('description_ru').notNull(),
    descriptionEn: text('description_en').notNull(),
    estimatedWeeks: integer('estimated_weeks').notNull().default(4),
    resourcesJson: jsonb('resources_json').$type<string[]>().notNull(),
  },
  (table) => [index('idx_learning_roadmaps_career_id').on(table.careerId)]
);

// 15. user_progress
export const userProgress = pgTable(
  'user_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    roadmapStepId: integer('roadmap_step_id')
      .references(() => learningRoadmaps.id, { onDelete: 'cascade' })
      .notNull(),
    careerId: integer('career_id')
      .references(() => careers.id, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').notNull().default('not_started'), // 'not_started' | 'in_progress' | 'completed'
    notes: text('notes'),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_progress_user_id').on(table.userId),
    uniqueIndex('uq_user_progress_user_step').on(
      table.userId,
      table.roadmapStepId
    ),
  ]
);

// 16. user_settings
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  language: text('language').notNull().default('uz'), // 'uz' | 'ru' | 'en'
  theme: text('theme').notNull().default('dark'), // 'dark' | 'light'
  emailNotifications: boolean('email_notifications').notNull().default(true),
  showExplanationsAfterSubmit: boolean('show_explanations_after_submit')
    .notNull()
    .default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. advisor_messages (persists AI advisor conversations per student)
export const advisorMessages = pgTable(
  'advisor_messages',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_advisor_messages_user_id').on(table.userId)]
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  attempts: many(testAttempts),
  results: many(testResults),
  skillScores: many(skillScores),
  recommendations: many(careerRecommendations),
  progress: many(userProgress),
  advisorMessages: many(advisorMessages),
}));

export const testCategoriesRelations = relations(testCategories, ({ many }) => ({
  tests: many(tests),
  results: many(testResults),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  category: one(testCategories, {
    fields: [tests.categoryId],
    references: [testCategories.id],
  }),
  questions: many(questions),
  attempts: many(testAttempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  test: one(tests, {
    fields: [questions.testId],
    references: [tests.id],
  }),
  options: many(answerOptions),
}));

export const answerOptionsRelations = relations(answerOptions, ({ one }) => ({
  question: one(questions, {
    fields: [answerOptions.questionId],
    references: [questions.id],
  }),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one, many }) => ({
  user: one(users, {
    fields: [testAttempts.userId],
    references: [users.id],
  }),
  test: one(tests, {
    fields: [testAttempts.testId],
    references: [tests.id],
  }),
  answers: many(userAnswers),
  result: one(testResults, {
    fields: [testAttempts.id],
    references: [testResults.attemptId],
  }),
}));

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [userAnswers.attemptId],
    references: [testAttempts.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(answerOptions, {
    fields: [userAnswers.selectedOptionId],
    references: [answerOptions.id],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  attempt: one(testAttempts, {
    fields: [testResults.attemptId],
    references: [testAttempts.id],
  }),
  user: one(users, {
    fields: [testResults.userId],
    references: [users.id],
  }),
  test: one(tests, {
    fields: [testResults.testId],
    references: [tests.id],
  }),
  category: one(testCategories, {
    fields: [testResults.categoryId],
    references: [testCategories.id],
  }),
}));

export const careerCategoriesRelations = relations(careerCategories, ({ many }) => ({
  careers: many(careers),
}));

export const careersRelations = relations(careers, ({ one, many }) => ({
  category: one(careerCategories, {
    fields: [careers.careerCategoryId],
    references: [careerCategories.id],
  }),
  roadmaps: many(learningRoadmaps),
  recommendations: many(careerRecommendations),
}));

export const learningRoadmapsRelations = relations(learningRoadmaps, ({ one }) => ({
  career: one(careers, {
    fields: [learningRoadmaps.careerId],
    references: [careers.id],
  }),
}));

export const careerRecommendationsRelations = relations(
  careerRecommendations,
  ({ one }) => ({
    user: one(users, {
      fields: [careerRecommendations.userId],
      references: [users.id],
    }),
    career: one(careers, {
      fields: [careerRecommendations.careerId],
      references: [careers.id],
    }),
  })
);
