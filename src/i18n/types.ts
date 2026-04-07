export type Language = 'es' | 'en' | 'pt';

export interface Translations {
  common: {
    loading: string;
    error: string;
    download: string;
    details: string;
    close: string;
    save: string;
    cancel: string;
    welcome: string;
    confirm: string;
    back: string;
    platform: string;
  };
  nav: {
    download: string;
    discord: string;
    hairsalon: string;
    wiki: string;
    login: string;
    logout: string;
  };
  home: {
    hero: {
      title: string;
      subtitle: string;
      cta: string;
    };
    aurora: {
      tag: string;
      title: string;
      description: string;
      cta: string;
    };
    salon: {
      tag: string;
      title: string;
      description1: string;
      description2: string;
      cta: string;
    };
    video: {
      title: string;
      description: string;
    };
    gallery: {
      title: string;
      description: string;
    };
    community: {
      title: string;
      description: string;
      cta: string;
    };
  };
  hairSalon: {
    title: string;
    authRequired: string;
    loginToPublish: string;
    welcomeMessage: string;
    publishCreations: string;
    searchPlaceholder: string;
    filterAll: string;
    noResults: string;
    categoriesLabel: string;
    sortLabel: string;
    sortRecent: string;
    sortPopular: string;
    sortOldest: string;
    myCreations: string;
    preparingCatalog: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    deleteError: string;
    copySuccess: string;
    addedToFavorites: string;
    removedFromFavorites: string;
    view3D: string;
    noDescription: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    authRequiredTitle: string;
    authRequiredDesc: string;
    editTitle: string;
    publishTitle: string;
    editDesc: string;
    publishDesc: string;
    formName: string;
    formNamePlaceholder: string;
    formCode: string;
    formCodePlaceholder: string;
    formCategories: string;
    formCategoriesEmpty: string;
    formImage: string;
    formImagePlaceholder: string;
    formDescription: string;
    formDescriptionPlaceholder: string;
    formFieldRequired: string;
    formNameRequired: string;
    formCodeRequired: string;
    formImageRequired: string;
    formInvalidFields: string;
    updating: string;
    publishing: string;
    saveChanges: string;
    usernameFallback: string;
    editDesign: string;
    deleteDesign: string;
    copyCode: string;
    copied: string;
    like: string;
    unlike: string;
    author: string;
    categoryNormal: string;
  };
  footer: {
    rights: string;
    description: string;
  };
  languages: {
    es: string;
    en: string;
    pt: string;
    languageSuccess: string;
  };
  floatingMenu: {
    options: string;
    close: string;
    themeLight: string;
    themeDark: string;
    language: string;
  };
}

export type TranslationKey = keyof Translations | string;
