import { useContext, useState, useEffect, useCallback } from 'react';
import { LanguageContext } from '../providers/LanguageProvider';
import { i18nStore } from './store';
import type { Language } from './types';

export const useLanguage = () => {
// ── Estado
    const context = useContext(LanguageContext);
    const [storeState, setStoreState] = useState(i18nStore.getState());

// ── Efectos
    useEffect(() => {
      if (context) return;
      return i18nStore.subscribe(setStoreState);
    }, [context]);

// ── Handlers
  const setLanguage = (lang: Language) => {
    i18nStore.setLanguage(lang);
  };

  const t = useCallback((path: string): string => {
    const translations = storeState.translations;
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
  }, [storeState.translations]);


  return {
    language: storeState.language,
    setLanguage,
    t,
    isLoaded: storeState.isLoaded
  };
};
