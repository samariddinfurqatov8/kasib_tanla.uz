import { useEffect, useState } from 'react';
import { CheckCircle2, Compass, XCircle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import {
  formatDateShort,
  formatMeasurementType,
  formatSkillName,
  pickLang,
} from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type {
  QuestionOption,
  TestAttempt,
  TestCategory,
  TestResult,
} from '../types/index.ts';

interface ReviewQuestionItem {
  id: number;
  orderIndex: number;
  questionType: string;
  difficulty: string;
  promptUz: string;
  promptRu: string;
  promptEn: string;
  explanationUz: string | null;
  explanationRu: string | null;
  explanationEn: string | null;
  selectedOptionId: number | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  options: QuestionOption[];
}

interface ResultDetailResponse {
  result: TestResult;
  category: TestCategory | null;
  attempt: TestAttempt | null;
  previousAttemptsInCategory: TestResult[];
  reviewQuestions: ReviewQuestionItem[];
}

export function ResultsPage({ attemptId }: { attemptId: number }) {
  const { language, navigate, t } = useApp();
  const [data, setData] = useState<ResultDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<ResultDetailResponse>(
          `/api/analytics/results/${attemptId}`
        );
        if (active) setData(res);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Natijani yuklab bo‘lmadi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [attemptId]);

  const result = data?.result;
  const category = data?.category;
  const categoryTitle = category
    ? pickLang(category as unknown as Record<string, unknown>, 'title', language)
    : t.nav.history;

  const riasecEntries = result?.traitBreakdownJson
    ? Object.entries(result.traitBreakdownJson)
        .filter(([key]) => key.startsWith('riasec_'))
        .map(([key, score]) => ({
          name: formatSkillName(key, language),
          score: Number(score),
        }))
    : [];

  const elapsedSecs = data?.attempt?.elapsedSeconds ?? 0;
  const mins = Math.floor(elapsedSecs / 60);
  const secs = elapsedSecs % 60;

  return (
    <AppShell
      breadcrumb={categoryTitle}
      actionButton={
        <button
          type="button"
          onClick={() => navigate('/recommendations')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          style={{ backgroundColor: 'var(--accent-blue)' }}
        >
          <Compass className="w-4 h-4" />
          <span>{t.results.viewRecs}</span>
        </button>
      }
    >
      {error && (
        <div
          className="mb-4 p-4 rounded-xl border text-sm"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.3)',
            color: '#F87171',
          }}
        >
          {error}
        </div>
      )}

      {loading || !result ? (
        <div
          className="h-72 rounded-xl border animate-pulse"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        />
      ) : (
        <div className="space-y-8">
          {/* Summary Banner */}
          <section
            className="p-6 sm:p-8 rounded-xl border space-y-6"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#10B981' }}>
                  {t.results.completedBadge} ·{' '}
                  {formatMeasurementType(result.measurementType, language)}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  {categoryTitle}
                </h1>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.results.scoreLabel}
                </p>
                <p
                  className="font-mono-num text-3xl sm:text-4xl font-bold"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  {result.percentageScore}%
                </p>
              </div>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.results.correctLabel}
                </p>
                <p className="font-mono-num text-lg font-semibold mt-1">
                  {result.measurementType === 'interest'
                    ? `${result.totalQuestions} / ${result.totalQuestions}`
                    : `${result.correctCount} / ${result.totalQuestions}`}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.results.durationLabel}
                </p>
                <p className="font-mono-num text-lg font-semibold mt-1">
                  {mins} {t.results.minuteShort} {secs} {t.results.secondShort}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.history.colDate}
                </p>
                <p className="font-mono-num text-lg font-semibold mt-1">
                  {formatDateShort(result.createdAt, language)}
                </p>
              </div>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <h2 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                {t.results.summaryTitle}
              </h2>
              <p className="text-sm leading-relaxed">{result.summaryText}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/categories')}
                className="px-4 py-2 rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
              >
                {t.results.backToCategories}
              </button>
              <button
                type="button"
                onClick={() => navigate('/statistics')}
                className="px-4 py-2 rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
              >
                {t.results.viewStats}
              </button>
              <button
                type="button"
                onClick={() => navigate('/advisor')}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: 'var(--accent-purple)' }}
              >
                {t.results.askAdvisor}
              </button>
            </div>
          </section>

          {/* RIASEC Chart for Interest Tests */}
          {riasecEntries.length > 0 && (
            <section
              className="p-6 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="font-display text-lg font-semibold mb-4">
                {t.results.riasecChartTitle}
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riasecEntries} margin={{ top: 10, right: 16, left: -12, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,164,189,0.18)" />
                    <XAxis dataKey="name" tick={{ fill: '#93A4BD', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#93A4BD', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0D1729',
                        borderColor: 'rgba(147,164,189,0.25)',
                        color: '#F4F7FF',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="score" fill="#35C9F5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Previous attempts comparison in this category */}
          {data.previousAttemptsInCategory.length > 1 && (
            <section
              className="p-6 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="font-display text-lg font-semibold mb-4">
                {t.results.historyComparisonTitle}
              </h2>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {data.previousAttemptsInCategory.map((prev, idx) => (
                  <div
                    key={prev.id}
                    className="py-3 flex items-center justify-between text-sm"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span>
                      {t.results.attemptLabel} #{idx + 1} · {formatDateShort(prev.createdAt, language)}
                    </span>
                    <span className="font-mono-num font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                      {prev.percentageScore}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Question-by-question review */}
          {data.reviewQuestions.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold">{t.results.reviewTitle}</h2>
              <div className="space-y-4">
                {data.reviewQuestions.map((q, idx) => {
                  const selectedOpt = q.options.find((o) => o.id === q.selectedOptionId);
                  const correctOpt = q.options.find((o) => o.isCorrect);
                  const isInterest = q.questionType === 'interest_likert';
                  const explanation = pickLang(
                    q as unknown as Record<string, unknown>,
                    'explanation',
                    language
                  );

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-xl border space-y-3"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-display text-sm sm:text-base font-semibold">
                          <span className="font-mono-num mr-2" style={{ color: 'var(--text-muted)' }}>
                            {idx + 1}.
                          </span>
                          {pickLang(q as unknown as Record<string, unknown>, 'prompt', language)}
                        </p>
                        {!isInterest && (
                          <span className="shrink-0">
                            {q.isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-500" />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                        <div
                          className="p-3 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            {t.results.yourAnswer}
                          </p>
                          <p className="font-medium">
                            {selectedOpt
                              ? `${selectedOpt.optionKey}. ${pickLang(
                                  selectedOpt as unknown as Record<string, unknown>,
                                  'text',
                                  language
                                )}`
                              : t.results.unanswered}
                          </p>
                        </div>

                        {!isInterest && correctOpt && (
                          <div
                            className="p-3 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <p className="text-xs mb-1" style={{ color: '#10B981' }}>
                              {t.results.correctAnswer}
                            </p>
                            <p className="font-medium">
                              {correctOpt.optionKey}.{' '}
                              {pickLang(
                                correctOpt as unknown as Record<string, unknown>,
                                'text',
                                language
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {explanation && (
                        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-main)' }}>
                            {t.results.explanation}:{' '}
                          </strong>
                          {explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
