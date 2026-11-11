import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AdvisorPage } from './pages/AdvisorPage.tsx';
import { LoginPage, RecoverPasswordPage, RegisterPage } from './pages/AuthPages.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import {
  HistoryPage,
  ProfilePage,
  SettingsPage,
} from './pages/ProfileHistorySettingsPages.tsx';
import { RecommendationsPage } from './pages/RecommendationsPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';
import { StatisticsPage } from './pages/StatisticsPage.tsx';
import { TestRunnerPage } from './pages/TestRunnerPage.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth, navigate } = useApp();

  useEffect(() => {
    if (!loadingAuth && !user) {
      navigate('/login');
    }
  }, [loadingAuth, user, navigate]);

  if (loadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth, navigate } = useApp();

  useEffect(() => {
    if (!loadingAuth && user) {
      navigate('/dashboard');
    }
  }, [loadingAuth, user, navigate]);

  if (loadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (user) return null;
  return <>{children}</>;
}

function AppRoutes() {
  const { currentPath } = useApp();
  const path = currentPath.split('?')[0] || '/';

  if (path === '/') {
    return <LandingPage />;
  }
  if (path === '/register') {
    return (
      <GuestOnlyRoute>
        <RegisterPage />
      </GuestOnlyRoute>
    );
  }
  if (path === '/login') {
    return (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    );
  }
  if (path === '/recover') {
    return <RecoverPasswordPage />;
  }
  if (path === '/catalog') {
    return <CatalogPage />;
  }

  const testMatch = path.match(/^\/test\/(\d+)$/);
  if (testMatch) {
    return (
      <ProtectedRoute>
        <TestRunnerPage attemptId={Number(testMatch[1])} />
      </ProtectedRoute>
    );
  }

  const resultMatch = path.match(/^\/results\/(\d+)$/);
  if (resultMatch) {
    return (
      <ProtectedRoute>
        <ResultsPage attemptId={Number(resultMatch[1])} />
      </ProtectedRoute>
    );
  }

  if (path === '/dashboard') {
    return (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );
  }
  if (path === '/categories') {
    return (
      <ProtectedRoute>
        <CategoriesPage />
      </ProtectedRoute>
    );
  }
  if (path === '/statistics') {
    return (
      <ProtectedRoute>
        <StatisticsPage />
      </ProtectedRoute>
    );
  }
  if (path === '/recommendations') {
    return (
      <ProtectedRoute>
        <RecommendationsPage />
      </ProtectedRoute>
    );
  }
  if (path === '/advisor') {
    return (
      <ProtectedRoute>
        <AdvisorPage />
      </ProtectedRoute>
    );
  }
  if (path === '/history') {
    return (
      <ProtectedRoute>
        <HistoryPage />
      </ProtectedRoute>
    );
  }
  if (path === '/profile') {
    return (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    );
  }
  if (path === '/settings') {
    return (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    );
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
