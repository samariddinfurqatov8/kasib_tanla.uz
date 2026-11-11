import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Compass, ListChecks, MessageSquareText, Play } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon.tsx';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatDateShort, formatMeasurementType, pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type {
  AnalyticsOverview,
  CareerRecommendationDetail,
  EnrichedCategoryItem,
} from '../types/index.ts';

export function DashboardPage() {
  const { profile, language, navigate, t } = useApp();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [categories, setCategories] = useState<EnrichedCategoryItem[]>([]);
  const [recommendations, setRecommendations] = useState<CareerRecommendationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [ovRes, catRes, recRes] = await Promise.all([
          apiFetch<AnalyticsOverview>('/api/analytics/overview'),
          apiFetch<{ categories: EnrichedCategoryItem[] }>('/api/assessments/categories'),
          apiFetch<{ recommendations: CareerRecommendationDetail[] }>('/api/careers/recommendations'),
        ]);
        if (!active) return;
        setOverview(ovRes);
        setCategories(catRes.categories ?? []);
        setRecommendations(recRes.recommendations ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Ma’lumotlarni yuklab bo‘lmadi.');
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

  const inProgressItems = categories.filter((c) => c.activeAttempt !== null);

  return (
    <AppShell
      breadcrumb={t.nav.dashboard}
      actionButton={
        <button
          type="button"
          onClick={() => navigate('/categories')}
          className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-blue)' }}
        >
          {t.dashboard.goCategories}
        </button>
      }
    >
      <div className="space-y-8">
        {/* Welcome banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.dashboard.welcome}, {profile?.fullName || 'O‘quvchi'}
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t.dashboard.subtitle}
            </p>
          </div>
          {profile?.schoolGrade && (
            <p className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {profile.schoolGrade}
              {t.auth.gradeSuffix}
              {profile.schoolName ? ` · ${profile.schoolName}` : ''}
            </p>
          )}
        </div>

        {/* Onboarding hint if Google user hasn't updated school/grade */}
        {profile && !profile.onboardingCompleted && (
          <div
            className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t.dashboard.onboardingHint}
            </p>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              {t.dashboard.editProfile}
            </button>
          </div>
        )}

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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.dashboard.kpiProgress}
            </p>
            <p className="font-mono-num text-2xl font-bold">
              {loading ? '—' : `${overview?.overallProgressPct ?? 0}%`}
            </p>
            <div
              className="w-full h-1.5 rounded-full mt-3 overflow-hidden"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${overview?.overallProgressPct ?? 0}%`,
                  backgroundColor: 'var(--accent-blue)',
                }}
              />
            </div>
          </div>

          <div
            className="p-5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.dashboard.kpiCompleted}
            </p>
            <p className="font-mono-num text-2xl font-bold">
              {loading
                ? '—'
                : `${overview?.completedCategoriesCount ?? 0} / ${overview?.totalCategoriesCount ?? 8}`}
            </p>
            <p className="text-xs mt-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {overview?.completionStats.completedAttempts ?? 0} {t.categories.completedTimes}
            </p>
          </div>

          <div
            className="p-5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.dashboard.kpiKnowledge}
            </p>
            <p className="font-mono-num text-2xl font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {loading
                ? '—'
                : overview?.knowledgeAverage !== null && overview?.knowledgeAverage !== undefined
                  ? `${overview.knowledgeAverage}%`
                  : t.dashboard.notTested}
            </p>
          </div>

          <div
            className="p-5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              {t.dashboard.kpiCognitive}
            </p>
            <p className="font-mono-num text-2xl font-bold" style={{ color: 'var(--accent-purple)' }}>
              {loading
                ? '—'
                : overview?.cognitiveAverage !== null && overview?.cognitiveAverage !== undefined
                  ? `${overview.cognitiveAverage}%`
                  : t.dashboard.notTested}
            </p>
          </div>
        </div>

        {/* Active / In-progress tests */}
        {inProgressItems.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{t.dashboard.inProgressTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressItems.map((item) => (
                <div
                  key={item.category.id}
                  className="p-5 rounded-xl border flex items-center justify-between gap-4"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs mb-1 tabular-nums" style={{ color: 'var(--accent-cyan)' }}>
                      {item.activeAttempt?.answeredCount ?? 0} / {item.test?.questionCount ?? 20}{' '}
                      {t.dashboard.answeredOf}
                    </p>
                    <h3 className="font-display text-base font-semibold truncate">
                      {pickLang(
                        item.category as unknown as Record<string, unknown>,
                        'title',
                        language
                      )}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/test/${item.activeAttempt!.id}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t.dashboard.resumeTest}</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main 2-column grid: Top 3 Recommendations + Recent Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section
            className="lg:col-span-7 p-6 rounded-xl border flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-display text-lg font-semibold">{t.dashboard.topCareersTitle}</h2>
                {recommendations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/recommendations')}
                    className="text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap"
                    style={{ color: 'var(--accent-blue)' }}
                  >
                    {t.dashboard.viewAllRecs}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-20 rounded-lg animate-pulse"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    />
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-8 text-center max-w-md mx-auto">
                  <Compass
                    className="w-10 h-10 mx-auto mb-3"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <h3 className="font-display text-base font-semibold mb-2">
                    {t.dashboard.emptyRecsTitle}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                    {t.dashboard.emptyRecsBody}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/categories')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    <span>{t.dashboard.startFirstTest}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.recommendation.id}
                      className="p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs mb-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          #{rec.recommendation.rank} · {t.recommendations.academicLabel}:{' '}
                          {rec.recommendation.academicMatchScore}% · {t.recommendations.interestLabel}:{' '}
                          {rec.recommendation.interestMatchScore}%
                        </p>
                        <h3 className="font-display text-base font-semibold">
                          {pickLang(
                            rec.career as unknown as Record<string, unknown>,
                            'title',
                            language
                          )}
                        </h3>
                        <p className="text-xs line-clamp-2 mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {pickLang(
                            rec.recommendation as unknown as Record<string, unknown>,
                            'matchReason',
                            language
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p
                          className="font-mono-num text-xl font-bold"
                          style={{ color: 'var(--accent-cyan)' }}
                        >
                          {rec.recommendation.matchScore}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            className="lg:col-span-5 p-6 rounded-xl border flex flex-col justify-between space-y-6"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h2 className="font-display text-lg font-semibold mb-4">
                {t.dashboard.recentResultsTitle}
              </h2>

              {!loading && (overview?.resultsHistory?.length ?? 0) === 0 ? (
                <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>
                  {t.dashboard.emptyResultsBody}
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {(overview?.resultsHistory ?? []).slice(0, 5).map((res) => (
                    <div
                      key={res.id}
                      className="py-3 flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {pickLang(
                            res as unknown as Record<string, unknown>,
                            'categoryTitle',
                            language
                          )}
                        </p>
                        <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {formatMeasurementType(res.measurementType, language)} ·{' '}
                          {formatDateShort(res.createdAt, language)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono-num text-sm font-semibold">
                          {res.percentageScore}%
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/results/${res.attemptId}`)}
                          className="text-xs font-semibold hover:underline cursor-pointer"
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          {t.dashboard.viewResult}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                {t.dashboard.quickActionsTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium text-left cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <ListChecks className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-blue)' }} />
                  <span className="truncate">{t.dashboard.goCategories}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/statistics')}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium text-left cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                  <span className="truncate">{t.dashboard.goStats}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/advisor')}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium text-left cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <MessageSquareText
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--accent-purple)' }}
                  />
                  <span className="truncate">{t.dashboard.goAdvisor}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Category overview strip */}
        {categories.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{t.nav.categories}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {categories.map((item) => (
                <button
                  key={item.category.id}
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="p-3 rounded-xl border text-left cursor-pointer transition-colors hover:border-[#2878FF]/60"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <CategoryIcon
                    iconKey={item.category.iconKey}
                    className="w-4 h-4 mb-2"
                  />
                  <p className="text-xs font-semibold line-clamp-2 mb-1">
                    {pickLang(
                      item.category as unknown as Record<string, unknown>,
                      'title',
                      language
                    )}
                  </p>
                  <p className="font-mono-num text-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.latestResult ? `${item.latestResult.percentageScore}%` : '—'}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
