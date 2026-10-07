import { i18n } from './index';
import { getUnitSystem, toDisplayDistance, toDisplayElevation, toDisplaySpeed } from './units';

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

/** 24-hour clock time, e.g. "14:05". */
export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat(activeDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Time since `date` in words, e.g. "3 ay önce" / "3 months ago"; under a minute `justNow`
 * (10.02 "Son değişiklik: az önce").
 */
export function formatTimeAgo(date: Date, now: number, justNow: string) {
  const seconds = Math.round((date.getTime() - now) / 1000);
  if (Math.abs(seconds) < 60) {
    return justNow;
  }
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
  ];
  const [unit, size] = units.find(([, length]) => Math.abs(seconds) >= length) ?? ['minute', 60];
  return new Intl.RelativeTimeFormat(activeDateLocale(), { numeric: 'auto' }).format(
    Math.round(seconds / size),
    unit,
  );
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

/**
 * Distance, e.g. "72 km" on cards (`fractionDigits` 0) or "12,8 km" on route details (1).
 * Whole numbers never show a trailing ",0".
 */
export function formatDistance(km: number, fractionDigits = 0) {
  const value = formatNumber(toDisplayDistance(km), {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  });
  return i18n.t(getUnitSystem() === 'imperial' ? 'units.miles' : 'units.km', { value });
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

/** Ride clock for recorded time: "18:42" under an hour, "1:05:09" above (06.07, 08.x). */
export function formatRideClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/** Estimated duration on route cards (05.02 "~1 sa 30 dk"): `formatDuration` with a leading "~". */
export function formatApproxDuration(totalMinutes: number) {
  return i18n.t('units.approx', { value: formatDuration(totalMinutes) });
}

/** Speed, e.g. "41 km/sa" / "41 km/h". */
export function formatSpeed(kmh: number) {
  return i18n.t(getUnitSystem() === 'imperial' ? 'units.speedImperial' : 'units.speed', {
    value: formatNumber(Math.round(toDisplaySpeed(kmh))),
  });
}

/** Short unit labels for metric captions, e.g. "Mesafe (km)" / "Ort. hız (mph)". */
export function unitLabels() {
  const imperial = getUnitSystem() === 'imperial';
  return {
    distance: i18n.t(imperial ? 'units.milesShort' : 'units.kmShort'),
    speed: i18n.t(imperial ? 'units.mphShort' : 'units.kmhShort'),
  };
}

/** Signed elevation, e.g. "236 m", "-198 m". */
export function formatElevation(meters: number) {
  return i18n.t(getUnitSystem() === 'imperial' ? 'units.feet' : 'units.meters', {
    value: formatNumber(Math.round(toDisplayElevation(meters))),
  });
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
  const vowel = 'aı'.includes(lastVowel)
    ? 'ı'
    : 'ei'.includes(lastVowel)
      ? 'i'
      : 'ou'.includes(lastVowel)
        ? 'u'
        : 'ü';
  if (isTurkishCompoundPossessive(trimmed)) {
    return `’n${vowel}`;
  }
  return TR_VOWELS.includes(last) ? `’y${vowel}` : `’${vowel}`;
}

/** "Bostancı İskelesi", "Ağva Sahili": several words, the last ending in a possessive ı/i/u/ü. */
function isTurkishCompoundPossessive(name: string) {
  return /\s/.test(name) && 'ıiuü'.includes(name.toLocaleLowerCase('tr').slice(-1));
}
