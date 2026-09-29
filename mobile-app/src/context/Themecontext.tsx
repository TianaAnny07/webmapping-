import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Palette {
  bg: string;
  card: string;
  input: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  danger: string;
}

const LIGHT: Palette = {
  bg: '#f4f7f6',
  card: '#ffffff',
  input: '#f1f5f4',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  accent: '#00c9a7',
  danger: '#ef4444',
};

const DARK: Palette = {
  bg: '#0d1b24',
  card: '#132631',
  input: '#0f2029',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#1f3644',
  accent: '#2dd9b6',
  danger: '#f87171',
};
const GREEN: Palette = { bg: '#e8f5e9', card: '#ffffff', input: '#eef7ee', textPrimary: '#1b3a26', textSecondary: '#587a68', border: '#cfe8d4', accent: '#22a06b', danger: '#ef4444' };
const BLUE: Palette = { bg: '#eaf2fb', card: '#ffffff', input: '#eef4fb', textPrimary: '#16283f', textSecondary: '#5a7188', border: '#d3e3f4', accent: '#2563eb', danger: '#ef4444' };

export type ThemeId = 'light' | 'dark' | 'green' | 'blue';

export const THEME_LIST: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'light', label: 'Clair', swatch: '#f4f7f6' },
  { id: 'dark', label: 'Sombre', swatch: '#0d1b24' },
  { id: 'green', label: 'Vert doux', swatch: '#e8f5e9' },
  { id: 'blue', label: 'Bleu doux', swatch: '#eaf2fb' },
];

const PALETTES: Record<ThemeId, Palette> = { light: LIGHT, dark: DARK, green: GREEN, blue: BLUE };

interface ThemeContextValue {
  theme: ThemeId;
  isDark: boolean;
  colors: Palette;
  setTheme: (t: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && PALETTES[v as ThemeId]) setThemeState(v as ThemeId);
    });
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeId = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', colors: PALETTES[theme], setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>');
  return ctx;
}