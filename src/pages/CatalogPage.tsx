import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { AppShell, PublicHeader } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { pickLang } from '../i18n/translations.ts';
import { apiFetch } from '../lib/api.ts';
import type { CareerCategory, CareerItem } from '../types/index.ts';

export function CatalogPage() {
  const { user, language, t } = useApp();
  const [categories, setCategories] = useState<CareerCategory[]>([]);
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCareer, setSelectedCareer] = useState<CareerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (selectedCategory) params.set('category', selectedCategory);
        const url = `/api/careers${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await apiFetch<{ categories: CareerCategory[]; careers: CareerItem[] }>(url);
        if (!active) return;
        setCategories(res.categories ?? []);
        const list = res.careers ?? [];
        setCareers(list);

        const slugParam = new URLSearchParams(window.location.search).get('slug');
        if (slugParam) {
          const matched = list.find((c) => c.slug === slugParam);
          if (matched) {
            setSelectedCareer(matched);
            return;
          }
        }
        setSelectedCareer((prev) => {
          if (prev && list.some((c) => c.id === prev.id)) {
            return list.find((c) => c.id === prev.id) ?? list[0] ?? null;
          }
          return list[0] ?? null;
        });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Katalogni yuklab bo‘lmadi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selectedCategory]);

  const selectRelatedBySlug = (slug: string) => {
    const found = careers.find((c) => c.slug === slug);
    if (found) {
      setSelectedCareer(found);
      return;
    }
    setSelectedCategory('');
    setQuery('');
  };

  const innerContent = (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {t.catalog.title}
        </h1>
        <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t.catalog.subtitle}
        </p>
      </div>

      {/* Search & Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: selectedCategory === '' ? 'var(--accent-blue)' : 'var(--bg-card)',
              color: selectedCategory === '' ? '#FFFFFF' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {t.catalog.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor:
                  selectedCategory === cat.slug ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: selectedCategory === cat.slug ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {pickLang(cat as unknown as Record<string, unknown>, 'name', language)}
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

      {/* Split Master-Detail Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-2.5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl border animate-pulse"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              />
            ))
          ) : careers.length === 0 ? (
            <div
              className="p-6 rounded-xl border text-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {t.catalog.emptySearch}
            </div>
          ) : (
            careers.map((car) => {
              const active = selectedCareer?.id === car.id;
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => setSelectedCareer(car)}
                  className="w-full text-left p-4 rounded-xl border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--accent-blue) 12%, var(--bg-card))'
                      : 'var(--bg-card)',
                    borderColor: active ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    {car.category
                      ? pickLang(
                          car.category as unknown as Record<string, unknown>,
                          'name',
                          language
                        )
                      : ''}
                  </p>
                  <h2 className="font-display text-base font-semibold">
                    {pickLang(car as unknown as Record<string, unknown>, 'title', language)}
                  </h2>
                  <p
                    className="text-xs line-clamp-2 mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {pickLang(car as unknown as Record<string, unknown>, 'description', language)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7">
          {!selectedCareer ? (
            <div
              className="p-10 rounded-xl border text-center"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm">{t.catalog.selectPrompt}</p>
            </div>
          ) : (
            <div
              className="p-6 sm:p-8 rounded-xl border space-y-6"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                  {selectedCareer.category
                    ? pickLang(
                        selectedCareer.category as unknown as Record<string, unknown>,
                        'name',
                        language
                      )
                    : ''}
                </p>
                <h2 className="font-display text-2xl font-bold">
                  {pickLang(
                    selectedCareer as unknown as Record<string, unknown>,
                    'title',
                    language
                  )}
                </h2>
                <p
                  className="text-sm sm:text-base mt-2 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {pickLang(
                    selectedCareer as unknown as Record<string, unknown>,
                    'description',
                    language
                  )}
                </p>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t.catalog.requiredAbilities}
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {selectedCareer.requiredAbilitiesJson.map((a) => (
                      <li key={a}>• {a}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t.catalog.relevantSubjects}
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {selectedCareer.relevantSubjectsJson.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t.catalog.necessarySkills}
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {selectedCareer.necessarySkillsJson.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t.catalog.educationPathways}
                  </h3>
                  <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedCareer.educationPathwaysJson.map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div
                className="p-4 rounded-lg border space-y-1"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <h3 className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                  {t.catalog.outlookTitle}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {pickLang(
                    selectedCareer as unknown as Record<string, unknown>,
                    'outlookNote',
                    language
                  )}
                </p>
              </div>

              {selectedCareer.roadmap && selectedCareer.roadmap.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-display text-base font-semibold">
                    {t.catalog.roadmapTitle}
                  </h3>
                  <div className="space-y-2.5">
                    {selectedCareer.roadmap.map((step) => (
                      <div
                        key={step.id}
                        className="p-3.5 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <p className="text-xs font-mono-num" style={{ color: 'var(--text-muted)' }}>
                          {step.phaseLabel} · {step.estimatedWeeks} {t.recommendations.weeksShort}
                        </p>
                        <p className="text-sm font-semibold mt-0.5">
                          {pickLang(step as unknown as Record<string, unknown>, 'title', language)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {pickLang(
                            step as unknown as Record<string, unknown>,
                            'description',
                            language
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCareer.relatedCareersJson.length > 0 && (
                <div
                  className="pt-4 border-t"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                    {t.catalog.relatedCareers}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCareer.relatedCareersJson.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => selectRelatedBySlug(slug)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:border-[#2878FF]"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {slug.replace(/-/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (user) {
    return <AppShell breadcrumb={t.nav.catalog}>{innerContent}</AppShell>;
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <PublicHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {innerContent}
      </main>
    </div>
  );
}
