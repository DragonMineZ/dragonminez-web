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
    connectionError: string;
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
    vote: {
      tag: string;
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
    formImageInvalidProvider: string;
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
    itemsPerPage: string;
    createError: string;
    updateError: string;
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
  errors: {
    title404: string;
    desc404: string;
    title500: string;
    desc500: string;
    goHome: string;
    api: {
      alreadyExists: string;
      recordNotFound: string;
      invalidReference: string;
      databaseError: string;
      serverError: string;
      unauthorized: string;
      badRequest: string;
      hairNotFound: string;
      notOwned: string;
    };
  };
  viewer: {
    title: string;
    backToList: string;
    hairCode: string;
    rawData: string;
    placeholderCode: string;
    render: string;
    copy: string;
    done: string;
    appearance: string;
    customColor: string;
    resetColor: string;
    identification: string;
    unnamedDesign: string;
    unnamed: string;
    adjustment: string;
    position: string;
    verticalOffset: string;
    scaling: string;
    width: string;
    height: string;
    depth: string;
    form: string;
    currentForm: string;
    prevForm: string;
    nextForm: string;
    noCode: string;
    decodeError: string;
    parseError: string;
  };
  votepage: {
    title: string;
    before_start_title: string;
    before_start_desc: string;
    schedule_text: string;
    vote_button: string;
    zamasu_desc: string;
    moro_desc: string;
    tsufuru_desc: string;
    confirm_title: string;
    confirm_desc: string;
    success_title: string;
    success_desc: string;
    stats_title: string;
    stats_desc: string;
    total_votes: string;
  };
}


export type TranslationKey = keyof Translations | string;
