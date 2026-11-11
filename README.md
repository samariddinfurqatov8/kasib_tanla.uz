# KASB TANLA

**"O‘z qobiliyatingni kashf et. Kelajagingni tanla."**

KASB TANLA is a full-stack student skills assessment, analytics, and career guidance platform with primary Uzbek (`uz`), Russian (`ru`), and English (`en`) localization.

## Architecture & Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Recharts + Lucide Icons
- **Backend**: Node.js (`v22+`) + Express + Zod + `tsx` (dev) / `node server.ts` (prod)
- **Database**: PostgreSQL (Cloud SQL) via `pg` + Drizzle ORM (`src/db/schema.ts`)
- **Authentication**: Password-based auth (`scryptSync` + 16-byte random salt + HMAC-SHA256 `HttpOnly` JWT session) & Google Sign-In via Firebase Auth (`firebase-admin` token verification)
- **AI Career Advisor**: Server-side `@google/genai` (`gemini-3.8-flash`) grounded in the student's actual PostgreSQL profile, skill scores, and test results

## Database Schema (16 Core Tables + Advisor History)

Defined in `src/db/schema.ts`:
1. `users`
2. `user_profiles`
3. `test_categories`
4. `tests`
5. `questions`
6. `answer_options`
7. `test_attempts`
8. `user_answers`
9. `test_results`
10. `skill_scores`
11. `career_categories`
12. `careers`
13. `career_recommendations`
14. `learning_roadmaps`
15. `user_progress`
16. `user_settings`
17. `advisor_messages`

Seed data includes:
- **8 Assessment Categories** × **20 original trilingual questions each** (**160 questions**, **640 options**) separating knowledge (`mathematics`, `natural-sciences`, `languages-literature`, `it-technology`), cognitive ability (`logical-thinking`, `memory-attention`, `creativity`), and Holland RIASEC personal interests (`career-aptitude`).
- **6 Career Categories**, **14 Careers**, and **56 Learning Roadmap steps**.

## Environment Setup

Copy `.env.example` and configure your runtime environment variables:

```bash
cp .env.example .env
```

Required variables:
- `SQL_HOST` — Cloud SQL Unix socket path (`/cloudsql/PROJECT:REGION:INSTANCE`) or PostgreSQL host
- `SQL_DB_NAME` — PostgreSQL database name (`kasb_tanla`)
- `SQL_USER`, `SQL_PASSWORD` — Application database credentials
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` — Migration admin credentials (`drizzle.config.ts`)
- `SESSION_SECRET` — Random secret used to sign JWT session cookies
- `GEMINI_API_KEY` — Google Gemini API key (server-side only, optional; core platform works if omitted)

## Database Migrations & Commands

```bash
# Install dependencies
npm install

# Generate Drizzle SQL migration files into ./drizzle/
npm run db:generate

# Apply schema changes to PostgreSQL
npm run db:push

# Run development server (Express API + Vite middleware on port 3000)
npm run dev

# Build frontend for production and run production server
npm run build
npm start
```
