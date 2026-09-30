/** Ride categories ("Sürüş tipi" / Tone) used across record, badges and lists. */
export type RideType = 'city' | 'longRide' | 'nature' | 'curves' | 'sport' | 'offRoad' | 'coast';

/** Ride types in the order the design lists them (N0mch, a2e36, dlaPh). */
export const RIDE_TYPES: readonly RideType[] = [
  'city',
  'longRide',
  'nature',
  'curves',
  'sport',
  'offRoad',
  'coast',
];

/** User-facing Turkish labels, exactly as written in the design. */
export const rideTypeLabels: Record<RideType, string> = {
  city: 'Şehir İçi',
  longRide: 'Uzun Yol',
  nature: 'Doğa',
  curves: 'Viraj',
  sport: 'Sportif',
  offRoad: 'Off-road',
  coast: 'Sahil',
};
