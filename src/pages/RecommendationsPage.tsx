import { useEffect, useState } from 'react';
import { Compass, RefreshCw, ShieldCheck } from 'lucide-react';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatSkillName, pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { CareerRecommendationDetail } from '../types/index.ts';

export function RecommendationsPage() {
  const { language, navigate, t } = useApp();
  const [items, setItems] = useState<CareerRecommendationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = async () => {
    try {
      const res = await apiFetch<{ recommendations: CareerRecommendationDetail[] }>(
        '/api/careers/recommendations'
      );
      setItems(res.recommendations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tavsiyalarni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    setError(null);
    try {
      await apiFetch('/api/careers/recommendations/recompute', { method: 'POST' });
      await loadRecommendations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qayta hisoblashda xatolik.');
    } finally {
      setRecomputing(false);
    }
  };

  const handleRoadmapStatusChange = async (
    careerId: number,
    roadmapStepId: number,
    status: 'not_started' | 'in_progress' | 'completed'
  ) => {
    setItems((prev) =>
      prev.map((rec) =>
        rec.career?.id === careerId
          ? {
              ...rec,
              roadmap: rec.roadmap.map((step) =>
                step.id === roadmapStepId ? { ...step, progressStatus: status } : step
              ),
            }
          : rec
      )
    );

    try {
      await apiFetch('/api/careers/progress', {
        method: 'PUT',
        body: JSON.stringify({ careerId, roadmapStepId, status }),
      });
    } catch (err) {
      console.error('Failed to save roadmap progress:', err);
    }
  };

  return (
    <AppShell
      breadcrumb={t.nav.recommendations}
      actionButton={
        <button
          type="button"
          disabled={recomputing || items.length === 0}
          onClick={() => void handleRecompute()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-main)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
          <span>{t.recommendations.recomputeBtn}</span>
        </button>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.recommendations.title}
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.recommendations.subtitle}
          </p>
        </div>

        <div
          className="p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-cyan)' }} />
          <p>{t.recommendations.honestyDisclaimer}</p>
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
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-xl border animate-pulse"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="p-10 rounded-xl border text-center max-w-xl mx-auto"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <Compass className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-display text-lg font-semibold mb-2">
              {t.recommendations.emptyTitle}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t.recommendations.emptyBody}
            </p>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              {t.statistics.goToTests}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map((item) => {
              const { recommendation: rec, career, roadmap } = item;
              if (!career) return null;

              return (
                <article
                  key={rec.id}
                  className="p-6 sm:p-8 rounded-xl border space-y-6"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="max-w-3xl">
                      <p
                        className="font-mono-num text-xs font-semibold mb-1"
                        style={{ color: 'var(--accent-cyan)' }}
                      >
                        #{rec.rank} · {t.recommendations.overallMatch}: {rec.matchScore}%
                      </p>
                      <h2 className="font-display text-2xl font-bold">
                        {pickLang(career as unknown as Record<string, unknown>, 'title', language)}
                      </h2>
                      <p className="text-sm sm:text-base mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {pickLang(
                          career as unknown as Record<string, unknown>,
                          'description',
                          language
                        )}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.recommendations.overallMatch}
                      </p>
                      <p
                        className="font-mono-num text-3xl font-bold"
                        style={{ color: 'var(--accent-cyan)' }}
                      >
                        {rec.matchScore}%
                      </p>
                    </div>
                  </div>

                  {/* Distinct Measurement Breakdown: Academic vs Cognitive vs Interest */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{t.recommendations.academicLabel}</span>
                        <span className="font-mono-num">{rec.academicMatchScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${rec.academicMatchScore}%`, backgroundColor: '#2878FF' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{t.recommendations.cognitiveLabel}</span>
                        <span className="font-mono-num">{rec.cognitiveMatchScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${rec.cognitiveMatchScore}%`, backgroundColor: '#35C9F5' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{t.recommendations.interestLabel}</span>
                        <span className="font-mono-num">{rec.interestMatchScore}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${rec.interestMatchScore}%`, backgroundColor: '#895BFF' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Why it matches + Strengths & Gaps */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    <div className="lg:col-span-6 space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          {t.recommendations.whyMatches}
                        </h3>
                        <p className="text-sm leading-relaxed">
                          {pickLang(
                            rec as unknown as Record<string, unknown>,
                            'matchReason',
                            language
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold mb-2" style={{ color: '#10B981' }}>
                            {t.recommendations.strengthsLabel}
                          </h4>
                          <ul className="space-y-1 text-sm">
                            {(rec.strengthsJson ?? []).map((sk) => (
                              <li key={sk}>• {formatSkillName(sk, language)}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold mb-2" style={{ color: '#F59E0B' }}>
                            {t.recommendations.skillsToDevelopLabel}
                          </h4>
                          <ul className="space-y-1 text-sm">
                            {(rec.skillsToDevelopJson ?? []).map((sk) => (
                              <li key={sk}>• {formatSkillName(sk, language)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          {t.recommendations.subjectsLabel}
                        </h3>
                        <p className="text-sm">
                          {career.relevantSubjectsJson.join(' · ')}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          {t.recommendations.pathwaysLabel}
                        </h3>
                        <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {career.educationPathwaysJson.map((pw) => (
                            <li key={pw}>• {pw}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Interactive 4-stage Learning Roadmap */}
                  {roadmap.length > 0 && (
                    <div
                      className="pt-6 border-t space-y-4"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <h3 className="font-display text-base font-semibold">
                        {t.recommendations.roadmapTitle}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roadmap.map((step) => {
                          const currentStatus = step.progressStatus ?? 'not_started';
                          return (
                            <div
                              key={step.id}
                              className="p-4 rounded-xl border flex flex-col justify-between gap-3"
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              <div>
                                <p className="text-xs font-mono-num mb-1" style={{ color: 'var(--text-muted)' }}>
                                  {step.phaseLabel} · {step.estimatedWeeks} {t.recommendations.weeksShort}
                                </p>
                                <h4 className="font-display text-sm font-semibold mb-1">
                                  {pickLang(
                                    step as unknown as Record<string, unknown>,
                                    'title',
                                    language
                                  )}
                                </h4>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                  {pickLang(
                                    step as unknown as Record<string, unknown>,
                                    'description',
                                    language
                                  )}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                {(
                                  [
                                    { key: 'not_started', label: t.recommendations.statusNotStarted },
                                    { key: 'in_progress', label: t.recommendations.statusInProgress },
                                    { key: 'completed', label: t.recommendations.statusCompleted },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() =>
                                      void handleRoadmapStatusChange(career.id, step.id, opt.key)
                                    }
                                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                                    style={{
                                      backgroundColor:
                                        currentStatus === opt.key
                                          ? opt.key === 'completed'
                                            ? '#10B981'
                                            : opt.key === 'in_progress'
                                              ? 'var(--accent-blue)'
                                              : 'var(--bg-elevated)'
                                          : 'var(--bg-main)',
                                      color:
                                        currentStatus === opt.key && opt.key !== 'not_started'
                                          ? '#FFFFFF'
                                          : 'var(--text-secondary)',
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
