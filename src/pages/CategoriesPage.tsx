import { useEffect, useState } from 'react';
import { Clock, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon.tsx';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatMeasurementType, pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { EnrichedCategoryItem, MeasurementType } from '../types/index.ts';

export function CategoriesPage() {
  const { language, navigate, t } = useApp();
  const [items, setItems] = useState<EnrichedCategoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | MeasurementType>('all');
  const [selectedItem, setSelectedItem] = useState<EnrichedCategoryItem | null>(null);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiFetch<{ categories: EnrichedCategoryItem[] }>(
          '/api/assessments/categories'
        );
        if (active) setItems(res.categories ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Kategoriyalarni yuklab bo‘lmadi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    filter === 'all'
      ? items
      : items.filter((item) => item.category.measurementType === filter);

  const handleStartTest = async (testId: number, forceNew: boolean) => {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch<{ attemptId: number }>(
        `/api/assessments/tests/${testId}/start`,
        {
          method: 'POST',
          body: JSON.stringify({ forceNew }),
        }
      );
      setSelectedItem(null);
      navigate(`/test/${res.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testni boshlashda xatolik.');
    } finally {
      setStarting(false);
    }
  };

  const filterButtons: Array<{ key: 'all' | MeasurementType; label: string }> = [
    { key: 'all', label: t.categories.filterAll },
    { key: 'knowledge', label: t.categories.filterKnowledge },
    { key: 'cognitive', label: t.categories.filterCognitive },
    { key: 'interest', label: t.categories.filterInterest },
  ];

  return (
    <AppShell breadcrumb={t.nav.categories}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.categories.title}
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t.categories.subtitle}
            </p>
          </div>

          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border self-start"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilter(btn.key)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  backgroundColor: filter === btn.key ? 'var(--accent-blue)' : 'transparent',
                  color: filter === btn.key ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            className="p-4 rounded-xl border text-sm"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderColor: 'rgba(220, 38, 38, 0.3)',
              color: '#F87171',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-52 rounded-xl border animate-pulse"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const { category, test, activeAttempt, latestResult, completedCount } = item;
              const qCount = test?.questionCount ?? 20;
              const mins = test?.estimatedMinutes ?? 12;

              return (
                <div
                  key={category.id}
                  className="p-6 rounded-xl border flex flex-col justify-between gap-5"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${category.accentColor || '#2878FF'} 16%, transparent)`,
                          color: category.accentColor || '#2878FF',
                        }}
                      >
                        <CategoryIcon iconKey={category.iconKey} className="w-5 h-5" />
                      </div>

                      <div className="text-right text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        <span>{formatMeasurementType(category.measurementType, language)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {qCount} {t.categories.questionsUnit}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {mins} {t.categories.minutesUnit}
                        </span>
                      </div>
                    </div>

                    <h2 className="font-display text-lg font-semibold mb-2">
                      {pickLang(category as unknown as Record<string, unknown>, 'title', language)}
                    </h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {pickLang(
                        category as unknown as Record<string, unknown>,
                        'description',
                        language
                      )}
                    </p>
                  </div>

                  <div
                    className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {activeAttempt ? (
                        <span style={{ color: 'var(--accent-cyan)' }}>
                          {activeAttempt.answeredCount ?? 0} / {qCount} {t.dashboard.answeredOf}
                        </span>
                      ) : latestResult ? (
                        <span>
                          {t.categories.latestScore}:{' '}
                          <strong className="font-mono-num" style={{ color: 'var(--text-main)' }}>
                            {latestResult.percentageScore}%
                          </strong>{' '}
                          · {completedCount} {t.categories.completedTimes}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          0 {t.categories.completedTimes}
                        </span>
                      )}
                    </div>

                    {test && (
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--accent-blue)' }}
                      >
                        {activeAttempt ? (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>{t.categories.resumeBtn}</span>
                          </>
                        ) : latestResult ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t.categories.retakeBtn}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>{t.categories.startBtn}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions & Start Confirmation Modal */}
      {selectedItem && selectedItem.test && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="max-w-lg w-full rounded-xl border p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                {t.categories.instructionsTitle}
              </p>
              <h2 className="font-display text-xl font-bold">
                {pickLang(
                  selectedItem.category as unknown as Record<string, unknown>,
                  'title',
                  language
                )}
              </h2>
            </div>

            <div
              className="flex items-center gap-4 text-xs tabular-nums"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {selectedItem.test.estimatedMinutes} {t.categories.minutesUnit}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedItem.test.questionCount} {t.categories.questionsUnit}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatMeasurementType(selectedItem.category.measurementType, language)}</span>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
              {pickLang(
                selectedItem.test as unknown as Record<string, unknown>,
                'instructions',
                language
              )}
            </p>

            <div
              className="p-4 rounded-lg border space-y-2 text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <p>• {t.categories.instructionNote1}</p>
              <p>• {t.categories.instructionNote2}</p>
              <p className="flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent-cyan)' }} />
                <span>{t.categories.instructionNote3}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={starting}
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t.categories.cancel}
              </button>

              {selectedItem.activeAttempt ? (
                <>
                  <button
                    type="button"
                    disabled={starting}
                    onClick={() => void handleStartTest(selectedItem.test!.id, true)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer"
                    style={{
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {t.categories.startFreshBtn}
                  </button>
                  <button
                    type="button"
                    disabled={starting}
                    onClick={() => void handleStartTest(selectedItem.test!.id, false)}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    {t.categories.continueSavedBtn}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => void handleStartTest(selectedItem.test!.id, false)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-blue)' }}
                >
                  {t.categories.startBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
