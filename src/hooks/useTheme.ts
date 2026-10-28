import { useCallback, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

export const THEME_STORAGE_KEY = 'split_theme_v1';
export const DARK_THEME_COLOR = '#0f172a';
export const LIGHT_THEME_COLOR = '#f8fafc';

export function readStoredTheme(): ThemeMode {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'dark';
    }
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') {
      return raw;
    }
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function writeStoredTheme(theme: ThemeMode): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Si localStorage lanza SecurityError o QuotaExceededError, mantener tema en memoria sin fallar
  }
}

export function applyThemeToDom(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    applyThemeToDom(nextTheme);
    writeStoredTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDom(next);
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}

