import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

/** Brand grid order on 00.9 (QKDo5, row by row). */
export const REGISTRATION_BRANDS: readonly MotorcycleBrand[] = [
  'honda',
  'yamaha',
  'kawasaki',
  'suzuki',
  'bmw',
  'ducati',
  'ktm',
  'triumph',
  'harleyDavidson',
  'bajaj',
];

/** Year pills before "Diğer" on 00.10 (g4Zy4 draws four). */
const MODEL_YEAR_SHORTCUT_COUNT = 4;
/** Oldest year accepted in the "Diğer" field. */
export const MIN_MODEL_YEAR = 1950;

/**
 * The four most recent model years, newest first. Derived from today's date so the pills
 * don't go stale (the frame shows 2024–2021 because it was drawn in 2024).
 */
export function recentModelYears(now = new Date()) {
  const current = now.getFullYear();
  return Array.from({ length: MODEL_YEAR_SHORTCUT_COUNT }, (_, index) => current - index);
}

/** Next year's models are on sale from autumn, so they are accepted too. */
export function maxModelYear(now = new Date()) {
  return now.getFullYear() + 1;
}

export function isValidModelYear(year: number, now = new Date()) {
  return Number.isInteger(year) && year >= MIN_MODEL_YEAR && year <= maxModelYear(now);
}
