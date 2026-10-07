import { getLocales } from 'expo-localization';

import { deviceStore } from '@/lib/deviceStore';

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** `system` follows the device: Turkish devices get `tr`, every other language gets `en`. */
export type LanguagePreference = 'system' | AppLanguage;

/** Turkish is the product's primary language and the fallback for missing keys. */
export const FALLBACK_LANGUAGE: AppLanguage = 'tr';

/**
 * Default until the rider picks a language on "10.10 Ayarlar / Dil". Switch to `'system'` when
 * device-language detection should go live.
 */
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = 'tr';

export function getDeviceLanguage(): AppLanguage {
  const languageCode = getLocales()[0]?.languageCode;
  return languageCode === 'tr' ? 'tr' : 'en';
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === 'system' ? getDeviceLanguage() : preference;
}

const LANGUAGE_KEY = 'rolt.settings.language';

/** The rider's choice from "Dil" (10.10), or the default; read synchronously at startup. */
export function storedLanguagePreference(): LanguagePreference {
  try {
    const stored = deviceStore.getSync(LANGUAGE_KEY);
    return stored === 'system' || SUPPORTED_LANGUAGES.includes(stored as AppLanguage)
      ? (stored as LanguagePreference)
      : DEFAULT_LANGUAGE_PREFERENCE;
  } catch {
    return DEFAULT_LANGUAGE_PREFERENCE;
  }
}

export function storeLanguagePreference(preference: LanguagePreference) {
  return deviceStore.set(LANGUAGE_KEY, preference);
}
