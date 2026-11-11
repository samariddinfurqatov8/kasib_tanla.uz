export type Language = 'uz' | 'ru' | 'en';
export type ThemeMode = 'dark' | 'light';
export type MeasurementType = 'knowledge' | 'cognitive' | 'interest';

export interface UserAccount {
  id: number;
  uid: string;
  email: string | null;
  phone: string | null;
  authProvider: string;
}

export interface UserProfile {
  id: number;
  userId: number;
  fullName: string;
  schoolGrade: number;
  schoolName: string | null;
  city: string | null;
  bio: string | null;
  interestsText: string | null;
  onboardingCompleted: boolean;
}

export interface UserSettings {
  id: number;
  userId: number;
  language: Language;
  theme: ThemeMode;
  emailNotifications: boolean;
  showExplanationsAfterSubmit: boolean;
}

export interface TestCategory {
  id: number;
  slug: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
  measurementType: MeasurementType;
  iconKey: string;
  accentColor: string;
  sortOrder: number;
}

export interface TestMeta {
  id: number;
  categoryId: number;
  slug: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  instructionsUz: string;
  instructionsRu: string;
  instructionsEn: string;
  estimatedMinutes: number;
  questionCount: number;
}

export interface TestAttempt {
  id: number;
  userId: number;
  testId: number;
  status: 'in_progress' | 'completed';
  currentQuestionIndex: number;
  startedAt: string;
  completedAt: string | null;
  elapsedSeconds: number;
  answeredCount?: number;
}

export interface TestResult {
  id: number;
  attemptId: number;
  userId: number;
  testId: number;
  categoryId: number;
  measurementType: MeasurementType;
  rawScore: number;
  maxScore: number;
  percentageScore: number;
  correctCount: number;
  totalQuestions: number;
  summaryText: string;
  traitBreakdownJson: Record<string, number>;
  createdAt: string;
  categorySlug?: string;
  categoryTitleUz?: string;
  categoryTitleRu?: string;
  categoryTitleEn?: string;
  elapsedSeconds?: number;
}

export interface EnrichedCategoryItem {
  category: TestCategory;
  test: TestMeta | null;
  activeAttempt: TestAttempt | null;
  latestResult: TestResult | null;
  completedCount: number;
}

export interface QuestionOption {
  id: number;
  optionKey: string;
  textUz: string;
  textRu: string;
  textEn: string;
  isCorrect?: boolean;
  traitTag?: string | null;
}

export interface TestQuestion {
  id: number;
  orderIndex: number;
  questionType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skillDimension: string;
  promptUz: string;
  promptRu: string;
  promptEn: string;
  explanationUz?: string | null;
  explanationRu?: string | null;
  explanationEn?: string | null;
  options: QuestionOption[];
}

export interface SkillScore {
  id: number;
  userId: number;
  skillKey: string;
  measurementType: MeasurementType;
  scorePercentage: number;
  attemptsCount: number;
  updatedAt: string;
}

export interface AnalyticsOverview {
  overallProgressPct: number;
  completedCategoriesCount: number;
  totalCategoriesCount: number;
  knowledgeAverage: number | null;
  cognitiveAverage: number | null;
  skillScores: SkillScore[];
  interestProfile: SkillScore[];
  strongestAreas: SkillScore[];
  improvementAreas: SkillScore[];
  completionStats: {
    totalAttempts: number;
    completedAttempts: number;
    inProgressAttempts: number;
    totalMinutesSpent: number;
  };
  resultsHistory: TestResult[];
}

export interface CareerCategory {
  id: number;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
}

export interface LearningRoadmapStep {
  id: number;
  careerId: number;
  stepOrder: number;
  phaseLabel: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
  estimatedWeeks: number;
  resourcesJson: string[];
  progressStatus?: 'not_started' | 'in_progress' | 'completed';
  notes?: string | null;
}

export interface CareerItem {
  id: number;
  careerCategoryId: number;
  slug: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
  requiredAbilitiesJson: string[];
  relevantSubjectsJson: string[];
  educationPathwaysJson: string[];
  necessarySkillsJson: string[];
  relatedCareersJson: string[];
  weightProfileJson: Record<string, number>;
  outlookNoteUz: string;
  outlookNoteRu: string;
  outlookNoteEn: string;
  category?: CareerCategory | null;
  roadmap?: LearningRoadmapStep[];
}

export interface CareerRecommendationDetail {
  recommendation: {
    id: number;
    userId: number;
    careerId: number;
    rank: number;
    matchScore: number;
    academicMatchScore: number;
    cognitiveMatchScore: number;
    interestMatchScore: number;
    matchReasonUz: string;
    matchReasonRu: string;
    matchReasonEn: string;
    strengthsJson: string[];
    skillsToDevelopJson: string[];
    generatedAt: string;
  };
  career: CareerItem | null;
  roadmap: LearningRoadmapStep[];
}

export interface AdvisorMessage {
  id: number;
  userId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
