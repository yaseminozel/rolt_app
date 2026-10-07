import type { RideDetailsInput } from './ridesRepository';
import type { RideRecord } from './types';

/** "Notlar" limit (08.05 "0/280"). */
export const RIDE_NOTES_MAX = 280;
/** "Sürüş görselleri" limit (08.05 "0/10"). */
export const RIDE_PHOTOS_MAX = 10;

export type RideFormValues = RideDetailsInput;

export const formValuesFromRide = (ride: RideRecord): RideFormValues => ({
  title: ride.title,
  notes: ride.notes,
  rideType: ride.rideType,
  difficulty: ride.difficulty,
  surface: ride.surface,
  visibility: ride.visibility,
  photos: ride.photos,
});
