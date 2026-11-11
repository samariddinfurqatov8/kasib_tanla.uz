import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { apiFetch, setAuthToken } from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import type {
  Language,
  ThemeMode,
  UserAccount,
  UserProfile,
  UserSettings,
} from '../types/index.ts';

interface AuthResponse {
  user: UserAccount;
  profile: UserProfile | null;
  settings: UserSettings | null;
  token?: string;
}

interface AppContextValue {
  user: UserAccount | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  loadingAuth: boolean;
  language: Language;
  theme: ThemeMode;
  currentPath: string;
  navigate: (path: string) => void;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  updateLocalProfile: (profile: UserProfile) => void;
  updateLocalSettings: (settings: UserSettings) => void;
  refreshSession: () => Promise<void>;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  registerWithPassword: (payload: {
    fullName: string;
    identifier: string;
    password: string;
    schoolGrade: number;
    schoolName?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  t: (typeof TRANSLATIONS)['uz'];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [language, setLanguageState] = useState<Language>('uz');
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const applySessionPayload = useCallback((data: AuthResponse) => {
    if (data.token) {
      setAuthToken(data.token);
    }
    setUser(data.user);
    setProfile(data.profile ?? null);
    setSettings(data.settings ?? null);
    if (data.settings?.language) {
      setLanguageState(data.settings.language);
    }
    if (data.settings?.theme) {
      setThemeState(data.settings.theme);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiFetch<AuthResponse>('/api/auth/me');
      applySessionPayload(data);
    } catch {
      setUser(null);
      setProfile(null);
      setSettings(null);
    } finally {
      setLoadingAuth(false);
    }
  }, [applySessionPayload]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setLanguage = useCallback(
    async (nextLang: Language) => {
      setLanguageState(nextLang);
      if (user) {
        try {
          const res = await apiFetch<{ settings: UserSettings }>('/api/settings', {
            method: 'PUT',
            body: JSON.stringify({ language: nextLang }),
          });
          setSettings(res.settings);
        } catch (err) {
          console.error('Failed to persist language:', err);
        }
      }
    },
    [user]
  );

  const setTheme = useCallback(
    async (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      if (user) {
        try {
          const res = await apiFetch<{ settings: UserSettings }>('/api/settings', {
            method: 'PUT',
            body: JSON.stringify({ theme: nextTheme }),
          });
          setSettings(res.settings);
        } catch (err) {
          console.error('Failed to persist theme:', err);
        }
      }
    },
    [user]
  );

  const loginWithPassword = useCallback(
    async (identifier: string, password: string) => {
      const data = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      applySessionPayload(data);
    },
    [applySessionPayload]
  );

  const registerWithPassword = useCallback(
    async (payload: {
      fullName: string;
      identifier: string;
      password: string;
      schoolGrade: number;
      schoolName?: string;
    }) => {
      const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      applySessionPayload(data);
    },
    [applySessionPayload]
  );

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await result.user.getIdToken();
    const data = await apiFetch<AuthResponse>('/api/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    applySessionPayload(data);
  }, [applySessionPayload]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore cookie logout error
    }
    try {
      await signOut(auth);
    } catch {
      // ignore firebase signout error
    }
    setAuthToken(null);
    setUser(null);
    setProfile(null);
    setSettings(null);
    navigate('/');
  }, [navigate]);

  const updateLocalProfile = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile);
  }, []);

  const updateLocalSettings = useCallback((nextSettings: UserSettings) => {
    setSettings(nextSettings);
    setLanguageState(nextSettings.language);
    setThemeState(nextSettings.theme);
  }, []);

  const t = TRANSLATIONS[language] as (typeof TRANSLATIONS)['uz'];

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        settings,
        loadingAuth,
        language,
        theme,
        currentPath,
        navigate,
        setLanguage,
        setTheme,
        updateLocalProfile,
        updateLocalSettings,
        refreshSession,
        loginWithPassword,
        registerWithPassword,
        loginWithGoogle,
        logout,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
