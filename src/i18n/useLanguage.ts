import { useContext, useState, useEffect, useCallback } from 'react';
import { LanguageContext } from './LanguageProvider';
import { i18nStore } from './store';
import type { Language } from './types';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  const [storeState, setStoreState] = useState(i18nStore.getState());

  // Subscribe to the store only if we are NOT inside a provider
  useEffect(() => {
    if (context) return;
    return i18nStore.subscribe(setStoreState);
  }, [context]);

  // If we have a context, we use its optimized (memoized) values
  if (context) {
    return context;
  }

  // Fallback for isolated islands:
  const setLanguage = (lang: Language) => {
    i18nStore.setLanguage(lang);
  };

  const t = (path: string): string => {
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
  };

  return {
    language: storeState.language,
    setLanguage,
    t,
    isLoaded: storeState.isLoaded
  };
};
