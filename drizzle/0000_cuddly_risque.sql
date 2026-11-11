CREATE TABLE "advisor_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"option_key" text NOT NULL,
	"text_uz" text NOT NULL,
	"text_ru" text NOT NULL,
	"text_en" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"score_weight" integer DEFAULT 0 NOT NULL,
	"trait_tag" text
);
--> statement-breakpoint
CREATE TABLE "career_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_uz" text NOT NULL,
	"name_ru" text NOT NULL,
	"name_en" text NOT NULL,
	"description_uz" text NOT NULL,
	"description_ru" text NOT NULL,
	"description_en" text NOT NULL,
	CONSTRAINT "career_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "career_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"career_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"match_score" real NOT NULL,
	"academic_match_score" real NOT NULL,
	"cognitive_match_score" real NOT NULL,
	"interest_match_score" real NOT NULL,
	"match_reason_uz" text NOT NULL,
	"match_reason_ru" text NOT NULL,
	"match_reason_en" text NOT NULL,
	"strengths_json" jsonb NOT NULL,
	"skills_to_develop_json" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "careers" (
	"id" serial PRIMARY KEY NOT NULL,
	"career_category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title_uz" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_en" text NOT NULL,
	"description_uz" text NOT NULL,
	"description_ru" text NOT NULL,
	"description_en" text NOT NULL,
	"required_abilities_json" jsonb NOT NULL,
	"relevant_subjects_json" jsonb NOT NULL,
	"education_pathways_json" jsonb NOT NULL,
	"necessary_skills_json" jsonb NOT NULL,
	"related_careers_json" jsonb NOT NULL,
	"weight_profile_json" jsonb NOT NULL,
	"outlook_note_uz" text NOT NULL,
	"outlook_note_ru" text NOT NULL,
	"outlook_note_en" text NOT NULL,
	CONSTRAINT "careers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "learning_roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"career_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"phase_label" text NOT NULL,
	"title_uz" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_en" text NOT NULL,
	"description_uz" text NOT NULL,
	"description_ru" text NOT NULL,
	"description_en" text NOT NULL,
	"estimated_weeks" integer DEFAULT 4 NOT NULL,
	"resources_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"question_type" text DEFAULT 'knowledge_mcq' NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"skill_dimension" text NOT NULL,
	"prompt_uz" text NOT NULL,
	"prompt_ru" text NOT NULL,
	"prompt_en" text NOT NULL,
	"explanation_uz" text,
	"explanation_ru" text,
	"explanation_en" text,
	"max_score" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"skill_key" text NOT NULL,
	"measurement_type" text NOT NULL,
	"score_percentage" real NOT NULL,
	"attempts_count" integer DEFAULT 1 NOT NULL,
	"last_attempt_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"elapsed_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title_uz" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_en" text NOT NULL,
	"description_uz" text NOT NULL,
	"description_ru" text NOT NULL,
	"description_en" text NOT NULL,
	"measurement_type" text NOT NULL,
	"icon_key" text NOT NULL,
	"accent_color" text NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"measurement_type" text NOT NULL,
	"raw_score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"percentage_score" real NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"total_questions" integer NOT NULL,
	"summary_text" text NOT NULL,
	"trait_breakdown_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_results_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title_uz" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_en" text NOT NULL,
	"instructions_uz" text NOT NULL,
	"instructions_ru" text NOT NULL,
	"instructions_en" text NOT NULL,
	"estimated_minutes" integer DEFAULT 15 NOT NULL,
	"question_count" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_option_id" integer,
	"is_correct" boolean,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"school_grade" integer DEFAULT 9 NOT NULL,
	"school_name" text,
	"city" text,
	"bio" text,
	"interests_text" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"roadmap_step_id" integer NOT NULL,
	"career_id" integer NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"notes" text,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"language" text DEFAULT 'uz' NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"show_explanations_after_submit" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text,
	"auth_provider" text DEFAULT 'password' NOT NULL,
	"reset_token_hash" text,
	"reset_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "advisor_messages" ADD CONSTRAINT "advisor_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "careers" ADD CONSTRAINT "careers_career_category_id_career_categories_id_fk" FOREIGN KEY ("career_category_id") REFERENCES "public"."career_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_scores" ADD CONSTRAINT "skill_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_scores" ADD CONSTRAINT "skill_scores_last_attempt_id_test_attempts_id_fk" FOREIGN KEY ("last_attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_category_id_test_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."test_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_category_id_test_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."test_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_selected_option_id_answer_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."answer_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_roadmap_step_id_learning_roadmaps_id_fk" FOREIGN KEY ("roadmap_step_id") REFERENCES "public"."learning_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_advisor_messages_user_id" ON "advisor_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_answer_options_question_id" ON "answer_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_career_recs_user_id" ON "career_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_career_recs_user_career" ON "career_recommendations" USING btree ("user_id","career_id");--> statement-breakpoint
CREATE INDEX "idx_careers_category_id" ON "careers" USING btree ("career_category_id");--> statement-breakpoint
CREATE INDEX "idx_learning_roadmaps_career_id" ON "learning_roadmaps" USING btree ("career_id");--> statement-breakpoint
CREATE INDEX "idx_questions_test_id" ON "questions" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_questions_test_order" ON "questions" USING btree ("test_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_skill_scores_user_id" ON "skill_scores" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_skill_scores_user_skill" ON "skill_scores" USING btree ("user_id","skill_key");--> statement-breakpoint
CREATE INDEX "idx_test_attempts_user_id" ON "test_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_test_attempts_user_test_status" ON "test_attempts" USING btree ("user_id","test_id","status");--> statement-breakpoint
CREATE INDEX "idx_test_results_user_id" ON "test_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_test_results_user_category" ON "test_results" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_tests_category_id" ON "tests" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_user_answers_attempt_id" ON "user_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_answers_attempt_question" ON "user_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_user_progress_user_id" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_progress_user_step" ON "user_progress" USING btree ("user_id","roadmap_step_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone");