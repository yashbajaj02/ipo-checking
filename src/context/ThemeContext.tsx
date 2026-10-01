'use client';

import React, {
  createContext,
  useContext,
  useSyncExternalStore,
  useCallback,
  useEffect,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'ipo_theme_preference';
const DEFAULT_THEME: Theme = 'light';
const DEFAULT_RESOLVED: ResolvedTheme = 'light';

// In-memory theme store listeners
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignore storage exceptions
  }
  return DEFAULT_THEME;
}

function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return DEFAULT_RESOLVED;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(targetTheme: Theme): ResolvedTheme {
  if (targetTheme === 'light') return 'light';
  if (targetTheme === 'dark') return 'dark';
  return getSystemResolvedTheme();
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handleMedia = () => {
      callback();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };

    mediaQuery?.addEventListener('change', handleMedia);
    window.addEventListener('storage', handleStorage);

    return () => {
      listeners.delete(callback);
      mediaQuery?.removeEventListener('change', handleMedia);
      window.removeEventListener('storage', handleStorage);
    };
  }

  return () => {
    listeners.delete(callback);
  };
}

function getClientSnapshot(): string {
  const t = getStoredTheme();
  const r = resolveTheme(t);
  return `${t}:${r}`;
}

function getServerSnapshot(): string {
  return `${DEFAULT_THEME}:${DEFAULT_RESOLVED}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Sync safely with external browser storage and media queries
  const snapshot = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [themeStr, resolvedStr] = snapshot.split(':');
  const theme = (themeStr || DEFAULT_THEME) as Theme;
  const resolvedTheme = (resolvedStr || DEFAULT_RESOLVED) as ResolvedTheme;

  // Mounted flag via useSyncExternalStore (true only on client snapshot)
  const mounted = snapshot !== getServerSnapshot() || typeof window !== 'undefined';

  // Apply classes to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }
    notifyListeners();
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        mounted,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
