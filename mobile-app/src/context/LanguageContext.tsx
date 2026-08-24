import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { translations, Language, TranslationKey } from '../services/translations';
import { setSpeechLanguage } from '../services/Speech';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);


export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language: Language = 'fr';

  useEffect(() => {
    setSpeechLanguage('fr');
  }, []);

  const setLanguage = useCallback((_lang: Language) => {
    // Volontairement désactivé : l'app reste en français.
  }, []);

  const t = useCallback((key: TranslationKey) => translations.fr[key] || key, []);

  const value = useMemo(() => ({ language, setLanguage, t }), [setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage doit être utilisé dans <LanguageProvider>');
  return ctx;
}