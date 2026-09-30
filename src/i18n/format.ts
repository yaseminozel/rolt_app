import { i18n } from './index';

/** BCP 47 locale for the active language, used by Intl formatters. */
const activeLocale = () => (i18n.language === 'tr' ? 'tr-TR' : 'en-US');

/** Locale-aware number, e.g. 12.8 → "12,8" in Turkish and "12.8" in English. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}
