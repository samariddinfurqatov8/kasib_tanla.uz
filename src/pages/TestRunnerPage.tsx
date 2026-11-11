import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { TestAttempt, TestCategory, TestMeta, TestQuestion } from '../types/index.ts';

interface AttemptPayload {
  attempt: TestAttempt;
  test: TestMeta | null;
  category: TestCategory | null;
  questions: TestQuestion[];
  answers: Array<{ questionId: number; selectedOptionId: number | null }>;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TestRunnerPage({ attemptId }: { attemptId: number }) {
  const { language, navigate, t } = useApp();
  const [data, setData] = useState<AttemptPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState<Record<number, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    let active = true;
    async function loadAttempt() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<AttemptPayload>(`/api/assessments/attempts/${attemptId}`);
        if (!active) return;

        if (res.attempt.status === 'completed') {
          navigate(`/results/${attemptId}`);
          return;
        }

        const initialMap: Record<number, number> = {};
        for (const a of res.answers ?? []) {
          if (a.selectedOptionId) {
            initialMap[a.questionId] = a.selectedOptionId;
          }
        }

        setData(res);
        setSelectedMap(initialMap);
        const safeIndex = Math.min(
          Math.max(res.attempt.currentQuestionIndex ?? 0, 0),
          Math.max((res.questions?.length ?? 1) - 1, 0)
        );
        setCurrentIndex(safeIndex);
        setElapsedSeconds(res.attempt.elapsedSeconds ?? 0);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Testni yuklab bo‘lmadi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAttempt();
    return () => {
      active = false;
    };
  }, [attemptId, navigate]);

  useEffect(() => {
    if (loading || !data) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, data]);

  const questions = data?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((q) => Boolean(selectedMap[q.id])).length;
  const remainingCount = Math.max(questions.length - answeredCount, 0);
  const progressPct =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const persistAnswer = async (
    questionId: number,
    optionId: number,
    nextIndex: number
  ) => {
    setSaveState('saving');
    try {
      await apiFetch(`/api/assessments/attempts/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId,
          selectedOptionId: optionId,
          currentQuestionIndex: nextIndex,
          elapsedSeconds: elapsedRef.current,
        }),
      });
      setSaveState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Javobni avtomatik saqlab bo‘lmadi.');
      setSaveState('idle');
    }
  };

  const handleSelectOption = (optionId: number) => {
    if (!currentQuestion) return;
    setSelectedMap((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
    void persistAnswer(currentQuestion.id, optionId, currentIndex);
  };

  const handleGoIndex = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    setCurrentIndex(nextIdx);
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/assessments/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ elapsedSeconds: elapsedRef.current }),
      });
      navigate(`/results/${attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testni yakunlashda xatolik.');
      setSubmitting(false);
    }
  };

  const categoryTitle = data?.category
    ? pickLang(data.category as unknown as Record<string, unknown>, 'title', language)
    : t.nav.categories;

  const difficultyLabel = (diff: string) => {
    if (diff === 'hard') return t.runner.difficultyHard;
    if (diff === 'medium') return t.runner.difficultyMedium;
    return t.runner.difficultyEasy;
  };

  return (
    <AppShell
      breadcrumb={categoryTitle}
      actionButton={
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={loading || questions.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-blue)' }}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{t.runner.finishBtn}</span>
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

      {loading || !currentQuestion ? (
        <div
          className="h-96 rounded-xl border animate-pulse"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Stage */}
          <div className="lg:col-span-8 space-y-5">
            {/* Progress & Status Header */}
            <div
              className="p-4 sm:p-5 rounded-xl border space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="font-semibold">
                    {t.runner.questionWord} {currentIndex + 1} / {questions.length}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {t.runner.remaining}: {remainingCount}
                  </span>
                </div>

                <div className="flex items-center gap-4 tabular-nums">
                  <span
                    className="text-xs"
                    style={{
                      color:
                        saveState === 'saving'
                          ? 'var(--accent-cyan)'
                          : saveState === 'saved'
                            ? '#10B981'
                            : 'var(--text-muted)',
                    }}
                  >
                    {saveState === 'saving'
                      ? t.runner.saving
                      : saveState === 'saved'
                        ? t.runner.saved
                        : `${answeredCount} ${t.runner.answered}`}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 font-mono-num text-xs font-semibold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
              </div>

              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: 'var(--accent-blue)',
                  }}
                />
              </div>
            </div>

            {/* Active Question Card */}
            <div
              className="p-6 sm:p-8 rounded-xl border space-y-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p className="text-xs font-medium mb-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {t.runner.questionWord} #{currentIndex + 1} · {difficultyLabel(currentQuestion.difficulty)}
                </p>
                <h2 className="font-display text-lg sm:text-xl font-semibold leading-relaxed">
                  {pickLang(
                    currentQuestion as unknown as Record<string, unknown>,
                    'prompt',
                    language
                  )}
                </h2>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const selected = selectedMap[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(opt.id)}
                      className="w-full text-left p-4 rounded-xl border flex items-start gap-3.5 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selected
                          ? 'color-mix(in srgb, var(--accent-blue) 14%, var(--bg-secondary))'
                          : 'var(--bg-secondary)',
                        borderColor: selected ? 'var(--accent-blue)' : 'var(--border-subtle)',
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-md border flex items-center justify-center font-mono-num text-xs font-bold shrink-0 mt-0.5"
                        style={{
                          backgroundColor: selected ? 'var(--accent-blue)' : 'var(--bg-main)',
                          borderColor: selected ? 'var(--accent-blue)' : 'var(--border-strong)',
                          color: selected ? '#FFFFFF' : 'var(--text-secondary)',
                        }}
                      >
                        {selected ? <Check className="w-4 h-4" /> : opt.optionKey}
                      </span>
                      <span className="text-sm sm:text-base leading-relaxed pt-0.5">
                        {pickLang(opt as unknown as Record<string, unknown>, 'text', language)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div
                className="pt-5 border-t flex items-center justify-between gap-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => handleGoIndex(currentIndex - 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer disabled:opacity-40"
                  style={{
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t.runner.prevBtn}</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleGoIndex(currentIndex + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    <span>{t.runner.nextBtn}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <Send className="w-4 h-4" />
                    <span>{t.runner.finishBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Question Navigator Deck */}
          <aside
            className="lg:col-span-4 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">{t.runner.navigatorTitle}</h3>
              <span className="font-mono-num text-xs" style={{ color: 'var(--text-muted)' }}>
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(selectedMap[q.id]);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleGoIndex(idx)}
                    className="h-10 rounded-lg border font-mono-num text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isCurrent
                        ? 'var(--accent-blue)'
                        : isAnswered
                          ? 'color-mix(in srgb, var(--accent-cyan) 16%, var(--bg-secondary))'
                          : 'var(--bg-secondary)',
                      borderColor: isCurrent
                        ? 'var(--accent-blue)'
                        : isAnswered
                          ? 'var(--accent-cyan)'
                          : 'var(--border-subtle)',
                      color: isCurrent
                        ? '#FFFFFF'
                        : isAnswered
                          ? 'var(--accent-cyan)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              {t.runner.finishBtn}
            </button>
          </aside>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="max-w-md w-full rounded-xl border p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <h2 className="font-display text-lg font-bold">{t.runner.confirmTitle}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {remainingCount === 0
                ? t.runner.confirmBodyAnsweredAll
                : t.runner.confirmBodyPartial}
            </p>
            {remainingCount > 0 && (
              <p className="font-mono-num text-xs font-semibold" style={{ color: '#F59E0B' }}>
                {t.runner.unansweredCount}: {remainingCount}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t.runner.backToTestBtn}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmitTest()}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-blue)' }}
              >
                {submitting ? t.runner.submitting : t.runner.confirmSubmitBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
