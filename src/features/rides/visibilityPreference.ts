import { rideStorage } from './storage';
import { RIDE_VISIBILITIES, type RideVisibility } from './types';

const LAST_VISIBILITY_KEY = 'lastVisibility';
/** First ride is private; afterwards the last choice is remembered (decision 2026-10-07). */
const FIRST_RIDE_VISIBILITY: RideVisibility = 'private';

/**
 * The visibility new rides start with (10.04, last choice on 08.05). This device copy is read
 * instantly and offline; signed in, it mirrors `user_settings.default_ride_visibility`
 * (`sync/rideSettingsSync.ts`).
 */
export async function readDefaultVisibility(): Promise<RideVisibility> {
  const stored = await rideStorage.getPreference(LAST_VISIBILITY_KEY);
  return RIDE_VISIBILITIES.find((item) => item === stored) ?? FIRST_RIDE_VISIBILITY;
}

/** Writes the device copy only; changes by the rider go through `ridesRepository`. */
export const storeDefaultVisibility = (visibility: RideVisibility) =>
  rideStorage.setPreference(LAST_VISIBILITY_KEY, visibility);
