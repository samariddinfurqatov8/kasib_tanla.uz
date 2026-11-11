import { useEffect, useState } from 'react';
import { ArrowRight, BookMarked, Compass, Globe, Moon, ShieldCheck, Sun } from 'lucide-react';
import heroObservatoryImg from '../assets/images/hero_kasb_observatory_1794415593427.jpg';
import featureMatrixImg from '../assets/images/feature_assessment_matrix_1794415593428.jpg';
import featurePathwaysImg from '../assets/images/feature_career_pathways_1794415594557.jpg';
import { CategoryIcon } from '../components/CategoryIcon.tsx';
import { PublicHeader } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { formatMeasurementType, pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { CareerItem, Language, TestCategory } from '../types/index.ts';

function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`w-full h-full min-h-[240px] flex flex-col items-center justify-center p-6 text-center rounded-xl border ${className}`}
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--accent-blue) 18%, var(--bg-card)), color-mix(in srgb, var(--accent-purple) 18%, var(--bg-secondary)))',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <Compass className="w-10 h-10 mb-3" style={{ color: 'var(--accent-cyan)' }} />
        <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
          {fallbackTitle}
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function LandingPage() {
  const { user, language, setLanguage, theme, setTheme, navigate, t } = useApp();
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadPublicData() {
      try {
        const [catRes, carRes] = await Promise.all([
          apiFetch<{ categories: TestCategory[] }>('/api/public/categories'),
          apiFetch<{ careers: CareerItem[] }>('/api/careers'),
        ]);
        if (!active) return;
        setCategories(catRes.categories ?? []);
        setCareers((carRes.careers ?? []).slice(0, 6));
      } catch (err) {
        console.error('Failed to load landing preview data:', err);
      } finally {
        if (active) setLoadingPublic(false);
      }
    }
    void loadPublicData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            background:
              theme === 'dark'
                ? 'radial-gradient(ellipse 80% 55% at 20% 0%, rgba(40,120,255,0.16), transparent 65%), radial-gradient(ellipse 60% 45% at 85% 15%, rgba(137,91,255,0.13), transparent 60%), var(--bg-main)'
                : 'radial-gradient(ellipse 80% 55% at 20% 0%, rgba(40,120,255,0.08), transparent 65%), var(--bg-main)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pt-12 lg:pb-16">
            {/* Sub-header utility bar (language + theme) kept cleanly below top bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
              <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t.landing.heroEyebrow}
              </p>

              <div className="flex items-center gap-3">
                <div
                  className="inline-flex items-center p-0.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Globe className="w-3.5 h-3.5 mx-2" style={{ color: 'var(--text-muted)' }} />
                  {(['uz', 'ru', 'en'] as Language[]).map((langOpt) => (
                    <button
                      key={langOpt}
                      type="button"
                      onClick={() => void setLanguage(langOpt)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer uppercase whitespace-nowrap"
                      style={{
                        backgroundColor:
                          language === langOpt ? 'var(--accent-blue)' : 'transparent',
                        color: language === langOpt ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {langOpt}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Toggle theme"
                  onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2-Column Hero Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center">
                <h1
                  className="font-display font-bold tracking-tight text-balance leading-[1.12] mb-5"
                  style={{
                    fontSize: 'clamp(2.15rem, 3.8vw, 3.45rem)',
                    color: 'var(--text-main)',
                  }}
                >
                  {t.landing.heroTitle}
                </h1>
                <p
                  className="text-base sm:text-lg leading-relaxed max-w-2xl mb-8"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t.landing.heroDesc}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(user ? '/categories' : '/register')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    <span>{user ? t.dashboard.goCategories : t.landing.heroCtaPrimary}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <span>{t.landing.heroCtaSecondary}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 flex">
                <div
                  className="relative w-full rounded-xl overflow-hidden border surface-glass"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <ResilientImage
                    src={heroObservatoryImg}
                    alt="KASB TANLA skills analytics workspace"
                    fallbackTitle={t.brand}
                    className="w-full h-64 sm:h-80 lg:h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080E1C]/85 via-[#080E1C]/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs font-medium text-[#35C9F5] mb-1">
                      {t.brand}
                    </p>
                    <p className="text-sm font-medium text-[#F4F7FF]">
                      {t.tagline}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width 4-Column Metric Strip below Hero Split */}
            <div
              className="mt-12 pt-8 border-t grid grid-cols-2 lg:grid-cols-4 gap-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p
                  className="font-mono-num text-2xl sm:text-3xl font-bold"
                  style={{ color: 'var(--text-main)' }}
                >
                  8
                </p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t.landing.heroStat1Label}
                </p>
              </div>
              <div>
                <p
                  className="font-mono-num text-2xl sm:text-3xl font-bold"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  160+
                </p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t.landing.heroStat2Label}
                </p>
              </div>
              <div>
                <p
                  className="font-mono-num text-2xl sm:text-3xl font-bold"
                  style={{ color: 'var(--accent-purple)' }}
                >
                  14
                </p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t.landing.heroStat3Label}
                </p>
              </div>
              <div>
                <p
                  className="font-mono-num text-2xl sm:text-3xl font-bold"
                  style={{ color: 'var(--text-main)' }}
                >
                  3
                </p>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t.landing.heroStat4Label}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 01: 8 Assessment Categories */}
        <section id="directions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl mb-10">
            <h2
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-3"
              style={{ color: 'var(--text-main)' }}
            >
              {t.landing.section1Title}
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.landing.section1Subtitle}
            </p>
          </div>

          {loadingPublic ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 rounded-xl border animate-pulse"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(user ? '/categories' : '/register')}
                  className="text-left p-5 rounded-xl border transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${cat.accentColor || '#2878FF'} 16%, transparent)`,
                          color: cat.accentColor || '#2878FF',
                        }}
                      >
                        <CategoryIcon iconKey={cat.iconKey} className="w-5 h-5" />
                      </div>
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatMeasurementType(cat.measurementType, language)} · 20
                      </span>
                    </div>

                    <h3
                      className="font-display text-base font-semibold mb-2"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {pickLang(cat as unknown as Record<string, unknown>, 'title', language)}
                    </h3>
                    <p
                      className="text-sm leading-relaxed line-clamp-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {pickLang(cat as unknown as Record<string, unknown>, 'description', language)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Section 02: Methodology & Scientific Honesty */}
        <section
          id="methodology"
          className="border-y py-16"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-10">
              <h2
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-3"
                style={{ color: 'var(--text-main)' }}
              >
                {t.landing.section2Title}
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t.landing.section2Subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className="p-6 rounded-xl border flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <p
                      className="font-mono-num text-xs font-semibold mb-2"
                      style={{ color: 'var(--accent-blue)' }}
                    >
                      01
                    </p>
                    <h3
                      className="font-display text-lg font-semibold mb-2"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {t.landing.feature1Title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {t.landing.feature1Body}
                    </p>
                  </div>
                </div>

                <div
                  className="p-6 rounded-xl border flex flex-col justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <p
                      className="font-mono-num text-xs font-semibold mb-2"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      02
                    </p>
                    <h3
                      className="font-display text-lg font-semibold mb-2"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {t.landing.feature2Title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {t.landing.feature2Body}
                    </p>
                  </div>
                </div>

                <div
                  className="sm:col-span-2 p-6 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-5 items-center"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="sm:col-span-7">
                    <p
                      className="font-mono-num text-xs font-semibold mb-2"
                      style={{ color: 'var(--accent-purple)' }}
                    >
                      03
                    </p>
                    <h3
                      className="font-display text-lg font-semibold mb-2"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {t.landing.feature3Title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {t.landing.feature3Body}
                    </p>
                  </div>
                  <div className="sm:col-span-5 h-36 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                    <ResilientImage
                      src={featurePathwaysImg}
                      alt="Structured career pathway visualization"
                      fallbackTitle={t.landing.feature3Title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <div
                  className="flex-1 rounded-xl overflow-hidden border"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <ResilientImage
                    src={featureMatrixImg}
                    alt="Cognitive and academic assessment matrix"
                    fallbackTitle={t.landing.feature1Title}
                    className="w-full h-64 lg:h-full object-cover"
                  />
                </div>
                <div
                  className="p-5 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <h4 className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                      {t.landing.honestyTitle}
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {t.landing.honestyBody}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 03: Featured Career Catalog */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                {t.landing.catalogPreviewTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap cursor-pointer hover:underline underline-offset-4"
              style={{ color: 'var(--accent-blue)' }}
            >
              <span>{t.landing.catalogPreviewCta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careers.map((career) => (
              <button
                key={career.id}
                type="button"
                onClick={() => navigate(`/catalog?slug=${encodeURIComponent(career.slug)}`)}
                className="text-left p-5 rounded-xl border transition-colors hover:border-[#2878FF]/60 cursor-pointer flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>
                      {career.category
                        ? pickLang(career.category as unknown as Record<string, unknown>, 'name', language)
                        : ''}
                    </span>
                    <BookMarked className="w-4 h-4 shrink-0" />
                  </div>
                  <h3 className="font-display text-base font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                    {pickLang(career as unknown as Record<string, unknown>, 'title', language)}
                  </h3>
                  <p className="text-sm leading-relaxed line-clamp-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {pickLang(career as unknown as Record<string, unknown>, 'description', language)}
                  </p>
                </div>

                <p className="text-xs truncate pt-3 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {career.relevantSubjectsJson.slice(0, 3).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer
        className="border-t py-8"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              {t.brand}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {t.landing.footerNote}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <button type="button" onClick={() => navigate('/catalog')} className="hover:underline cursor-pointer">
              {t.nav.careers}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="hover:underline cursor-pointer">
              {t.nav.login}
            </button>
            <button type="button" onClick={() => navigate('/register')} className="hover:underline cursor-pointer">
              {t.nav.start}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
