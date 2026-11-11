import React, { useState } from 'react';
import {
  BarChart3,
  BookMarked,
  Compass,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { Language } from '../types/index.ts';

export function PublicHeader() {
  const { user, navigate, t } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, pathOrHash: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (pathOrHash.startsWith('#')) {
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.querySelector(pathOrHash)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        document.querySelector(pathOrHash)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(pathOrHash);
    }
  };

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-main) 88%, transparent)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
          style={{ color: 'var(--text-main)' }}
        >
          {t.brand}
        </a>

        {/* Zone 2: 4 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <a
            href="#directions"
            onClick={(e) => handleLinkClick(e, '#directions')}
            className="whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t.nav.directions}
          </a>
          <a
            href="#methodology"
            onClick={(e) => handleLinkClick(e, '#methodology')}
            className="whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t.nav.methodology}
          </a>
          <a
            href="/catalog"
            onClick={(e) => handleLinkClick(e, '/catalog')}
            className="whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t.nav.careers}
          </a>
          <a
            href={user ? '/dashboard' : '/login'}
            onClick={(e) => handleLinkClick(e, user ? '/dashboard' : '/login')}
            className="whitespace-nowrap shrink-0 transition-colors hover:underline underline-offset-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {user ? t.nav.dashboard : t.nav.login}
          </a>
        </nav>

        {/* Zone 3: 1 primary CTA + mobile toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-blue)' }}
          >
            {user ? t.nav.workspace : t.nav.start}
          </button>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg border cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <a
            href="#directions"
            onClick={(e) => handleLinkClick(e, '#directions')}
            className="py-2 text-sm font-medium"
            style={{ color: 'var(--text-main)' }}
          >
            {t.nav.directions}
          </a>
          <a
            href="#methodology"
            onClick={(e) => handleLinkClick(e, '#methodology')}
            className="py-2 text-sm font-medium"
            style={{ color: 'var(--text-main)' }}
          >
            {t.nav.methodology}
          </a>
          <a
            href="/catalog"
            onClick={(e) => handleLinkClick(e, '/catalog')}
            className="py-2 text-sm font-medium"
            style={{ color: 'var(--text-main)' }}
          >
            {t.nav.careers}
          </a>
          <a
            href={user ? '/dashboard' : '/login'}
            onClick={(e) => handleLinkClick(e, user ? '/dashboard' : '/login')}
            className="py-2 text-sm font-medium"
            style={{ color: 'var(--text-main)' }}
          >
            {user ? t.nav.dashboard : t.nav.login}
          </a>
        </div>
      )}
    </header>
  );
}

interface AppShellProps {
  breadcrumb: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, actionButton, children }: AppShellProps) {
  const {
    profile,
    user,
    currentPath,
    navigate,
    language,
    setLanguage,
    theme,
    setTheme,
    logout,
    t,
  } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { path: '/categories', label: t.nav.categories, icon: ListChecks },
    { path: '/statistics', label: t.nav.statistics, icon: BarChart3 },
    { path: '/recommendations', label: t.nav.recommendations, icon: Compass },
    { path: '/catalog', label: t.nav.catalog, icon: BookMarked },
    { path: '/advisor', label: t.nav.advisor, icon: MessageSquareText },
    { path: '/history', label: t.nav.history, icon: History },
    { path: '/profile', label: t.nav.profile, icon: User },
    { path: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const handleNav = (path: string) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const sidebarContent = (
    <div
      className="flex flex-col h-full border-r"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="h-16 px-6 flex items-center justify-between border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="font-display text-lg font-bold tracking-tight whitespace-nowrap cursor-pointer"
          style={{ color: 'var(--text-main)' }}
        >
          {t.brand}
        </button>
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-md cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            currentPath === item.path ||
            (item.path === '/categories' && currentPath.startsWith('/test/')) ||
            (item.path === '/history' && currentPath.startsWith('/results/'));

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left"
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--accent-blue) 14%, transparent)'
                  : 'transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom workspace controls */}
      <div
        className="p-4 border-t space-y-3 shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {(['uz', 'ru', 'en'] as Language[]).map((langOption) => (
              <button
                key={langOption}
                type="button"
                onClick={() => void setLanguage(langOption)}
                className="px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer uppercase"
                style={{
                  backgroundColor:
                    language === langOption ? 'var(--accent-blue)' : 'transparent',
                  color: language === langOption ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {langOption}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Toggle color theme"
            onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg border transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>

        <div
          className="pt-2 border-t flex items-center justify-between gap-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-main)' }}
            >
              {profile?.fullName || user?.email || 'O‘quvchi'}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {profile?.schoolGrade
                ? `${profile.schoolGrade}${t.auth.gradeSuffix}`
                : user?.email || user?.phone || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title={t.nav.logout}
            aria-label={t.nav.logout}
            className="p-2 rounded-lg border transition-colors cursor-pointer shrink-0 hover:opacity-80"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-[260px] max-w-[82vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main workspace column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 border-b flex items-center justify-between gap-4 backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-main) 88%, transparent)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border cursor-pointer shrink-0"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span
                className="hidden sm:inline whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                {t.brand}
              </span>
              <span
                className="hidden sm:inline"
                style={{ color: 'var(--text-muted)' }}
                aria-hidden="true"
              >
                /
              </span>
              <span
                className="font-semibold truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {breadcrumb}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actionButton}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
