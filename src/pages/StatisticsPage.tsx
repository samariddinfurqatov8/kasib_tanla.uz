import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatDateShort, formatSkillName, pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { AnalyticsOverview } from '../types/index.ts';

const RADAR_SKILL_KEYS = [
  'mathematics',
  'natural_sciences',
  'languages_literature',
  'it_technology',
  'logical_thinking',
  'memory_attention',
  'creativity',
];

const RIASEC_KEYS = [
  'riasec_r',
  'riasec_i',
  'riasec_a',
  'riasec_s',
  'riasec_e',
  'riasec_c',
];

export function StatisticsPage() {
  const { language, navigate, t } = useApp();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiFetch<AnalyticsOverview>('/api/analytics/overview');
        if (active) setData(res);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Statistikani yuklab bo‘lmadi.');
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

  const hasCompletedTests = (data?.completionStats.completedAttempts ?? 0) > 0;

  const radarData = RADAR_SKILL_KEYS.map((key) => {
    const found = data?.skillScores.find((s) => s.skillKey === key);
    return {
      subject: formatSkillName(key, language),
      score: found ? Math.round(found.scorePercentage) : 0,
    };
  });

  const riasecData = RIASEC_KEYS.map((key) => {
    const found = data?.interestProfile.find((s) => s.skillKey === key);
    return {
      trait: formatSkillName(key, language),
      score: found ? Math.round(found.scorePercentage) : 0,
    };
  });

  const timelineData = [...(data?.resultsHistory ?? [])]
    .reverse()
    .map((r, index) => ({
      label: `#${index + 1}`,
      category: pickLang(r as unknown as Record<string, unknown>, 'categoryTitle', language),
      date: formatDateShort(r.createdAt, language),
      score: Math.round(r.percentageScore),
    }));

  return (
    <AppShell breadcrumb={t.nav.statistics}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.statistics.title}
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.statistics.subtitle}
          </p>
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
          <div
            className="h-80 rounded-xl border animate-pulse"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          />
        ) : !hasCompletedTests ? (
          <div
            className="p-10 rounded-xl border text-center max-w-xl mx-auto"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <h2 className="font-display text-lg font-semibold mb-2">
              {t.statistics.noDataYet}
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t.statistics.noDataDesc}
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
          <>
            {/* Completion & Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className="p-5 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.dashboard.kpiProgress}
                </p>
                <p className="font-mono-num text-2xl font-bold">{data?.overallProgressPct ?? 0}%</p>
              </div>
              <div
                className="p-5 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.dashboard.kpiKnowledge}
                </p>
                <p className="font-mono-num text-2xl font-bold" style={{ color: 'var(--accent-cyan)' }}>
                  {data?.knowledgeAverage !== null && data?.knowledgeAverage !== undefined
                    ? `${data.knowledgeAverage}%`
                    : t.dashboard.notTested}
                </p>
              </div>
              <div
                className="p-5 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.dashboard.kpiCognitive}
                </p>
                <p className="font-mono-num text-2xl font-bold" style={{ color: 'var(--accent-purple)' }}>
                  {data?.cognitiveAverage !== null && data?.cognitiveAverage !== undefined
                    ? `${data.cognitiveAverage}%`
                    : t.dashboard.notTested}
                </p>
              </div>
              <div
                className="p-5 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.statistics.totalTime}
                </p>
                <p className="font-mono-num text-2xl font-bold">
                  {data?.completionStats.totalMinutesSpent ?? 0}
                </p>
              </div>
            </div>

            {/* Radar Chart + RIASEC Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section
                className="p-6 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <h2 className="font-display text-lg font-semibold mb-4">
                  {t.statistics.radarTitle}
                </h2>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(147,164,189,0.2)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#93A4BD', fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#6E819D', fontSize: 10 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#2878FF"
                        fill="#2878FF"
                        fillOpacity={0.35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D1729',
                          borderColor: 'rgba(147,164,189,0.25)',
                          color: '#F4F7FF',
                          borderRadius: '8px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section
                className="p-6 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <h2 className="font-display text-lg font-semibold mb-4">
                  {t.statistics.riasecTitle}
                </h2>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riasecData} margin={{ top: 10, right: 16, left: -12, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,164,189,0.16)" />
                      <XAxis dataKey="trait" tick={{ fill: '#93A4BD', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#93A4BD', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D1729',
                          borderColor: 'rgba(147,164,189,0.25)',
                          color: '#F4F7FF',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="score" fill="#895BFF" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Historical Attempts Chart */}
            <section
              className="p-6 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <h2 className="font-display text-lg font-semibold mb-4">
                {t.statistics.timelineTitle}
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#35C9F5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#35C9F5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,164,189,0.16)" />
                    <XAxis dataKey="label" tick={{ fill: '#93A4BD', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#93A4BD', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0D1729',
                        borderColor: 'rgba(147,164,189,0.25)',
                        color: '#F4F7FF',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#35C9F5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scoreFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Strongest vs Improvement Areas + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section
                className="p-6 rounded-xl border space-y-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <h2 className="font-display text-base font-semibold">
                  {t.statistics.strongestTitle}
                </h2>
                {data?.strongestAreas.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.statistics.noStrengthsYet}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data?.strongestAreas.map((s) => (
                      <div key={s.id} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span>{formatSkillName(s.skillKey, language)}</span>
                          <span className="font-mono-num font-semibold" style={{ color: '#10B981' }}>
                            {s.scorePercentage}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-elevated)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.scorePercentage}%`, backgroundColor: '#10B981' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="p-6 rounded-xl border space-y-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <h2 className="font-display text-base font-semibold">
                  {t.statistics.improvementTitle}
                </h2>
                {data?.improvementAreas.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.statistics.noImprovementsYet}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data?.improvementAreas.map((s) => (
                      <div key={s.id} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span>{formatSkillName(s.skillKey, language)}</span>
                          <span className="font-mono-num font-semibold" style={{ color: '#F59E0B' }}>
                            {s.scorePercentage}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-elevated)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.scorePercentage}%`, backgroundColor: '#F59E0B' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="p-6 rounded-xl border space-y-3"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <h2 className="font-display text-base font-semibold">
                  {t.statistics.completionTitle}
                </h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.statistics.totalAttempts}
                    </span>
                    <span className="font-mono-num font-semibold">
                      {data?.completionStats.totalAttempts ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.statistics.completedAttempts}
                    </span>
                    <span className="font-mono-num font-semibold">
                      {data?.completionStats.completedAttempts ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.statistics.inProgressAttempts}
                    </span>
                    <span className="font-mono-num font-semibold">
                      {data?.completionStats.inProgressAttempts ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.statistics.totalTime}
                    </span>
                    <span className="font-mono-num font-semibold">
                      {data?.completionStats.totalMinutesSpent ?? 0}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
