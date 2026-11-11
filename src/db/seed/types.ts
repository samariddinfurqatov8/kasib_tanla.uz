export type MeasurementType = 'knowledge' | 'cognitive' | 'interest';
export type QuestionType = 'knowledge_mcq' | 'cognitive_mcq' | 'rubric_interest';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SeedOption {
  optionKey: 'A' | 'B' | 'C' | 'D';
  textUz: string;
  textRu: string;
  textEn: string;
  isCorrect: boolean;
  scoreWeight: number;
  traitTag?: string;
}

export interface SeedQuestion {
  orderIndex: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  skillDimension: string;
  promptUz: string;
  promptRu: string;
  promptEn: string;
  explanationUz: string;
  explanationRu: string;
  explanationEn: string;
  maxScore: number;
  options: SeedOption[];
}

export interface SeedCategoryWithTest {
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
  testSlug: string;
  testTitleUz: string;
  testTitleRu: string;
  testTitleEn: string;
  instructionsUz: string;
  instructionsRu: string;
  instructionsEn: string;
  estimatedMinutes: number;
  questions: SeedQuestion[];
}

export interface SeedCareerCategory {
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
}

export interface SeedRoadmapStep {
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
}

export interface SeedCareer {
  categorySlug: string;
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
  roadmapSteps: SeedRoadmapStep[];
}
