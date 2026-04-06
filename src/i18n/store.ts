import type { Language, Translations } from './types';

export interface I18nState {
  language: Language;
  translations: Translations | null;
  isLoaded: boolean;
}

type Listener = (state: I18nState) => void;

const STORAGE_KEY = 'dragonminez_lang';

class I18nStore {
  private state: I18nState;
  private listeners: Set<Listener> = new Set();
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.state = {
      language: this.getInitialLanguage(),
      translations: null,
      isLoaded: false,
    };
    
    // Auto-load initial language on client
    if (typeof window !== 'undefined') {
      this.loadTranslations(this.state.language);
    }
  }

  private getInitialLanguage(): Language {
    if (typeof window === 'undefined') return 'es';
    
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && ['es', 'en', 'pt'].includes(saved)) return saved;

    const browserLang = navigator.language.split('-')[0];
    if (['es', 'en', 'pt'].includes(browserLang)) return browserLang as Language;

    return 'es';
  }

  getState() {
    return this.state;
  }

  setLanguage(lang: Language) {
    if (lang === this.state.language && this.state.isLoaded) return;
    
    this.state = { ...this.state, language: lang, isLoaded: false };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      this.loadTranslations(lang);
    }
    this.notify();
  }

  async loadTranslations(lang: Language) {
    // Avoid double loading the same thing
    if (this.loadingPromise && this.state.language === lang) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        let module;
        switch (lang) {
          case 'en': module = await import('./translations/en'); break;
          case 'pt': module = await import('./translations/pt'); break;
          case 'es': 
          default: module = await import('./translations/es'); break;
        }

        this.state = { 
          ...this.state, 
          translations: module.default, 
          isLoaded: true 
        };
        this.notify();
      } catch (error) {
        console.error(`[i18n] Failed to load "${lang}":`, error);
        // Fallback
        if (lang !== 'es') {
          await this.loadTranslations('es');
        }
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// Global singleton to share state across islands in the client
export const i18nStore = new I18nStore();
