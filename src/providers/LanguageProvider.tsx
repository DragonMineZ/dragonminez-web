import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../i18n/types';
import { i18nStore } from '../i18n/store';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isLoaded: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
// ── Estado
    const [state, setState] = useState(i18nStore.getState());

// ── Efectos
    useEffect(() => {
      if (typeof window === 'undefined') return;
      return i18nStore.subscribe(setState);
    }, []);

  const setLanguage = useCallback((lang: Language) => {
    i18nStore.setLanguage(lang);
  }, []);

// ── Handlers
  const t = useCallback((path: string): string => {
    const translations = state.translations;
    if (!translations) return path;

    const keys = path.split('.');
    let value: any = translations;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path;
      }
    }

    return typeof value === 'string' ? value : path;
  }, [state.translations]);

  const contextValue = useMemo(() => ({
    language: state.language,
    setLanguage,
    t,
    isLoaded: state.isLoaded
  }), [state.language, setLanguage, t, state.isLoaded]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
