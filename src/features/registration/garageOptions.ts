import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

/** Brand list order of the "Marka" sheet (04.04 `M3llIj`). */
export const REGISTRATION_BRANDS: readonly MotorcycleBrand[] = [
  'honda',
  'yamaha',
  'bajaj',
  'ktm',
  'suzuki',
  'kawasaki',
  'bmw',
  'ducati',
  'triumph',
  'harleyDavidson',
];

/** Oldest model year offered in the "Yıl" sheet. */
export const MIN_MODEL_YEAR = 1950;

/**
 * Model years of the "Yıl" sheet (04.06 `su2g3`), newest first: the current year down to
 * `MIN_MODEL_YEAR`. Derived from today's date so the list doesn't go stale (the frame starts
 * at 2025 because it was drawn then).
 */
export function modelYears(now = new Date()) {
  const current = now.getFullYear();
  return Array.from({ length: current - MIN_MODEL_YEAR + 1 }, (_, index) => current - index);
}
