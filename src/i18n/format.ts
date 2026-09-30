import { i18n } from './index';

/** BCP 47 locale for the active language, used by Intl formatters. */
const activeLocale = () => (i18n.language === 'tr' ? 'tr-TR' : 'en-US');

/** Locale-aware number, e.g. 12.8 → "12,8" in Turkish and "12.8" in English. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}

/**
 * Day-first dates in both languages ("30 Eylül", "30 September"), so English uses the
 * British locale here; `en-US` would give "September 30".
 */
const activeDateLocale = () => (i18n.language === 'tr' ? 'tr-TR' : 'en-GB');

/** Day and full month name, e.g. "30 Eylül" / "30 September". */
export function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat(activeDateLocale(), { day: 'numeric', month: 'long' }).format(date);
}

/** 24-hour clock time, e.g. "14:05". */
export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat(activeDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** Locative suffix of the last spoken word of 0–59 ("bir" → "de", "üç" → "te", "otuz" → "da"). */
const TR_UNIT_SUFFIX = ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'];
const TR_TENS_SUFFIX = ['da', 'da', 'de', 'da', 'ta', 'de'];

/**
 * Turkish locative suffix for a clock time as it is read aloud, so copy like
 * "14:05’te", "14:30’da", "14:00’te" stays grammatical for any time. The minutes decide;
 * on the full hour the hour does ("on dört" → "te").
 */
export function turkishTimeLocativeSuffix(date: Date) {
  const minutes = date.getMinutes();
  const spoken = minutes === 0 ? date.getHours() : minutes;
  const unit = spoken % 10;
  return unit === 0 ? TR_TENS_SUFFIX[Math.floor(spoken / 10)] : TR_UNIT_SUFFIX[unit];
}

/**
 * Distance, e.g. "72 km" on cards (`fractionDigits` 0) or "12,8 km" on route details (1).
 * Whole numbers never show a trailing ",0".
 */
export function formatDistance(km: number, fractionDigits = 0) {
  const value = formatNumber(km, { maximumFractionDigits: fractionDigits, minimumFractionDigits: 0 });
  return i18n.t('units.km', { value });
}

/** Duration from minutes: "1 sa 25 dk", "1 sa", "50 dk" (en: "1 h 25 min", "1 h", "50 min"). */
export function formatDuration(totalMinutes: number) {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) {
    return i18n.t('units.minutes', { minutes });
  }
  if (minutes === 0) {
    return i18n.t('units.hours', { hours });
  }
  return i18n.t('units.hoursMinutes', { hours, minutes });
}

/** Speed, e.g. "41 km/sa" / "41 km/h". */
export function formatSpeed(kmh: number) {
  return i18n.t('units.speed', { value: formatNumber(Math.round(kmh)) });
}

/** Signed elevation, e.g. "236 m", "-198 m". */
export function formatElevation(meters: number) {
  return i18n.t('units.meters', { value: formatNumber(Math.round(meters)) });
}
