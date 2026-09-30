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

/** Short date and time, e.g. "12 Eyl 2026, 19:30" / "12 Sept 2026, 19:30" (ride feed cards). */
export function formatDateTime(date: Date) {
  const day = new Intl.DateTimeFormat(activeDateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  return `${day}, ${formatClockTime(date)}`;
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

const TR_BACK_VOWELS = 'aıou';
const TR_VOWELS = 'aıoueiöü';
/** Voiceless consonants ("fıstıkçı şahap") harden a following d → t. */
const TR_VOICELESS = 'fstkçşhp';

/** Last vowel of a Turkish word (lower-cased), defaulting to "e" for vowelless tokens. */
function lastTurkishVowel(word: string) {
  const lower = word.toLocaleLowerCase('tr');
  for (let index = lower.length - 1; index >= 0; index -= 1) {
    if (TR_VOWELS.includes(lower[index])) {
      return lower[index];
    }
  }
  return 'e';
}

/**
 * Turkish locative suffix for a proper noun, apostrophe included:
 * "Büyükada" → "’da", "Kadıköy" → "’de", "Şişli" → "’de", "Bostancı İskelesi" → "’nde".
 * Two-word names ending in a possessive vowel ("… İskelesi", "… Sahili") take the buffer "n".
 */
export function turkishLocativeSuffix(name: string) {
  const trimmed = name.trim();
  const last = trimmed.toLocaleLowerCase('tr').slice(-1);
  const vowel = TR_BACK_VOWELS.includes(lastTurkishVowel(trimmed)) ? 'a' : 'e';
  if (isTurkishCompoundPossessive(trimmed)) {
    return `’nd${vowel}`;
  }
  return `’${TR_VOICELESS.includes(last) ? 't' : 'd'}${vowel}`;
}

/**
 * Turkish accusative suffix for a proper noun, apostrophe included:
 * "Büyükada" → "’yı", "Kadıköy" → "’ü", "Bostancı İskelesi" → "’ni", "Şile Feneri" → "’ni".
 * Limitation: a one-word name that is itself a possessive compound ("Denizkızı") is read as
 * a plain vowel ending ("’yı"); rare for place names returned by search.
 */
export function turkishAccusativeSuffix(name: string) {
  const trimmed = name.trim();
  const last = trimmed.toLocaleLowerCase('tr').slice(-1);
  const lastVowel = lastTurkishVowel(trimmed);
  const vowel = 'aı'.includes(lastVowel) ? 'ı' : 'ei'.includes(lastVowel) ? 'i' : 'ou'.includes(lastVowel) ? 'u' : 'ü';
  if (isTurkishCompoundPossessive(trimmed)) {
    return `’n${vowel}`;
  }
  return TR_VOWELS.includes(last) ? `’y${vowel}` : `’${vowel}`;
}

/** "Bostancı İskelesi", "Ağva Sahili": several words, the last ending in a possessive ı/i/u/ü. */
function isTurkishCompoundPossessive(name: string) {
  return /\s/.test(name) && 'ıiuü'.includes(name.toLocaleLowerCase('tr').slice(-1));
}
