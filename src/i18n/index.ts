import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE_PREFERENCE, FALLBACK_LANGUAGE, resolveLanguage, SUPPORTED_LANGUAGES } from './language';
import { NAMESPACES, resources } from './resources';

/** App-wide i18next instance; react-i18next hooks pick it up through `initReactI18next`. */
export const i18n = createInstance();

// Resources are bundled, so initialization completes synchronously before the first render.
i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(DEFAULT_LANGUAGE_PREFERENCE),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export * from './language';
