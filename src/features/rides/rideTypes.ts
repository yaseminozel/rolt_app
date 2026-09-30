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

/** Translation key for a ride type label (namespace `rides`). */
export const rideTypeLabelKey = (type: RideType) => `types.${type}` as const;
