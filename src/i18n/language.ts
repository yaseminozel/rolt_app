import { getLocales } from 'expo-localization';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** `system` follows the device: Turkish devices get `tr`, every other language gets `en`. */
export type LanguagePreference = 'system' | AppLanguage;

/** Turkish is the product's primary language and the fallback for missing keys. */
export const FALLBACK_LANGUAGE: AppLanguage = 'tr';

/**
 * Current default. Switch to `'system'` when device-language detection should go live;
 * the "03.10 Ayarlar / Dil" screen will let users override it.
 */
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = 'tr';

export function getDeviceLanguage(): AppLanguage {
  const languageCode = getLocales()[0]?.languageCode;
  return languageCode === 'tr' ? 'tr' : 'en';
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === 'system' ? getDeviceLanguage() : preference;
}
