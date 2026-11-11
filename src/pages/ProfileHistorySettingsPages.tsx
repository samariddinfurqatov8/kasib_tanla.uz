import React, { useEffect, useState } from 'react';
import { CheckCircle2, History, Moon, Sun } from 'lucide-react';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatDateShort, formatMeasurementType, pickLang } from '../i18n/translations.ts';
import { apiFetch, ApiError } from '../lib/api.ts';
import type {
  AnalyticsOverview,
  Language,
  ThemeMode,
  UserProfile,
  UserSettings,
} from '../types/index.ts';

export function ProfilePage() {
  const { user, profile, updateLocalProfile, t } = useApp();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [schoolGrade, setSchoolGrade] = useState<number>(profile?.schoolGrade ?? 9);
  const [schoolName, setSchoolName] = useState(profile?.schoolName ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [interestsText, setInterestsText] = useState(profile?.interestsText ?? '');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? '');
      setSchoolGrade(profile.schoolGrade ?? 9);
      setSchoolName(profile.schoolName ?? '');
      setCity(profile.city ?? '');
      setBio(profile.bio ?? '');
      setInterestsText(profile.interestsText ?? '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    setError(null);
    try {
      const res = await apiFetch<{ profile: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          schoolGrade,
          schoolName: schoolName.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
          interestsText: interestsText.trim() || null,
        }),
      });
      updateLocalProfile(res.profile);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Profilni saqlab bo‘lmadi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell breadcrumb={t.nav.profile}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.profile.title}
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.profile.subtitle}
          </p>
        </div>

        <div
          className="p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 text-sm"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {t.profile.accountInfo}
            </p>
            <p className="font-medium">{user?.email || user?.phone || user?.uid}</p>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {t.profile.providerLabel}
            </p>
            <p className="font-mono-num uppercase text-xs font-semibold">
              {user?.authProvider}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="p-6 sm:p-8 rounded-xl border space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {error && (
            <div
              className="p-3 rounded-lg border text-sm"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderColor: 'rgba(220, 38, 38, 0.35)',
                color: '#F87171',
              }}
            >
              {error}
            </div>
          )}

          {savedNotice && (
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.profile.savedSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t.auth.fullName}
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t.auth.schoolGrade}
              </label>
              <select
                value={schoolGrade}
                onChange={(e) => setSchoolGrade(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    {g}
                    {t.auth.gradeSuffix}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t.auth.schoolName}
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t.profile.city}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.profile.interestsText}
            </label>
            <input
              type="text"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.profile.bio}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              {t.profile.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export function HistoryPage() {
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
          setError(err instanceof Error ? err.message : 'Tarixni yuklab bo‘lmadi.');
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

  const results = data?.resultsHistory ?? [];

  return (
    <AppShell breadcrumb={t.nav.history}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.history.title}
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.history.subtitle}
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
            className="h-64 rounded-xl border animate-pulse"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          />
        ) : results.length === 0 ? (
          <div
            className="p-10 rounded-xl border text-center max-w-lg mx-auto"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <History className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {t.history.emptyBody}
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
          <div
            className="rounded-xl border overflow-x-auto"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr
                  className="border-b text-xs font-semibold"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  <th className="py-3.5 px-5">{t.history.colCategory}</th>
                  <th className="py-3.5 px-4">{t.history.colType}</th>
                  <th className="py-3.5 px-4 text-right">{t.history.colScore}</th>
                  <th className="py-3.5 px-4 text-right">{t.history.colTime}</th>
                  <th className="py-3.5 px-4">{t.history.colDate}</th>
                  <th className="py-3.5 px-5 text-right">{t.history.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: 'var(--border-subtle)' }}>
                {results.map((r) => {
                  const secs = r.elapsedSeconds ?? 0;
                  const minPart = Math.floor(secs / 60);
                  const secPart = secs % 60;
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <td className="py-3.5 px-5 font-medium">
                        {pickLang(
                          r as unknown as Record<string, unknown>,
                          'categoryTitle',
                          language
                        )}
                      </td>
                      <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                        {formatMeasurementType(r.measurementType, language)}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right font-mono-num font-semibold"
                        style={{ color: 'var(--accent-cyan)' }}
                      >
                        {r.percentageScore}%
                      </td>
                      <td
                        className="py-3.5 px-4 text-right font-mono-num"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {minPart}:{String(secPart).padStart(2, '0')}
                      </td>
                      <td
                        className="py-3.5 px-4 tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {formatDateShort(r.createdAt, language)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/results/${r.attemptId}`)}
                          className="text-xs font-semibold hover:underline cursor-pointer"
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          {t.history.openResult}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function SettingsPage() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    settings,
    updateLocalSettings,
    t,
  } = useApp();
  const [savedToast, setSavedToast] = useState(false);

  const showToast = () => {
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2000);
  };

  const handleLangChange = async (nextLang: Language) => {
    await setLanguage(nextLang);
    showToast();
  };

  const handleThemeChange = async (nextTheme: ThemeMode) => {
    await setTheme(nextTheme);
    showToast();
  };

  const handleToggleSetting = async (
    key: 'emailNotifications' | 'showExplanationsAfterSubmit',
    value: boolean
  ) => {
    try {
      const res = await apiFetch<{ settings: UserSettings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
      updateLocalSettings(res.settings);
      showToast();
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  return (
    <AppShell breadcrumb={t.nav.settings}>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {t.settings.title}
            </h1>
            <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
              {t.settings.subtitle}
            </p>
          </div>
          {savedToast && (
            <span className="text-xs font-semibold text-emerald-500 whitespace-nowrap">
              {t.settings.savedToast}
            </span>
          )}
        </div>

        <div
          className="p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {/* Language */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">{t.settings.languageLabel}</h2>
            </div>
            <div
              className="inline-flex items-center p-1 rounded-lg border self-start"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {(
                [
                  { code: 'uz', label: 'O‘zbekcha' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'en', label: 'English' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => void handleLangChange(opt.code)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor:
                      language === opt.code ? 'var(--accent-blue)' : 'transparent',
                    color: language === opt.code ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Theme */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">{t.settings.themeLabel}</h2>
            </div>
            <div
              className="inline-flex items-center p-1 rounded-lg border self-start"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => void handleThemeChange('dark')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: theme === 'dark' ? 'var(--accent-blue)' : 'transparent',
                  color: theme === 'dark' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t.settings.themeDark}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleThemeChange('light')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: theme === 'light' ? 'var(--accent-blue)' : 'transparent',
                  color: theme === 'light' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t.settings.themeLight}</span>
              </button>
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Explanations Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">
                {t.settings.explanationsLabel}
              </h2>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.explanationsDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.showExplanationsAfterSubmit ?? true}
              onChange={(e) =>
                void handleToggleSetting('showExplanationsAfterSubmit', e.target.checked)
              }
              className="w-5 h-5 accent-[#2878FF] cursor-pointer mt-0.5 shrink-0"
            />
          </div>

          <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Notifications Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">
                {t.settings.notificationsLabel}
              </h2>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {t.settings.notificationsDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.emailNotifications ?? true}
              onChange={(e) =>
                void handleToggleSetting('emailNotifications', e.target.checked)
              }
              className="w-5 h-5 accent-[#2878FF] cursor-pointer mt-0.5 shrink-0"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
