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

interface ThemeContextValue {
  isDark: boolean;
  colors: Palette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ isDark, colors: isDark ? DARK : LIGHT, toggleTheme }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>');
  return ctx;
}