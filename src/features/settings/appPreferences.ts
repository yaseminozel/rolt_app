import { i18n } from '@/i18n';
import { storeLanguagePreference, type AppLanguage } from '@/i18n/language';
import { storeUnitSystem, type UnitSystem } from '@/i18n/units';

import { syncLocaleToServer } from './userSettings';

/**
 * "Dil" (10.10): switches the interface language at once and remembers it; the server's texts
 * (notifications, pushes, emails) follow in the background.
 */
export async function applyLanguage(language: AppLanguage) {
  await storeLanguagePreference(language);
  await i18n.changeLanguage(language);
  syncLocaleToServer(language);
}

/**
 * "Ölçü birimleri" (10.11). Formatters read the unit system while rendering, so re-emitting the
 * current language makes every translated screen render again with the new units.
 */
export async function applyUnitSystem(system: UnitSystem) {
  await storeUnitSystem(system);
  await i18n.changeLanguage(i18n.language);
}
