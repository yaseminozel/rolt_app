import { rideStorage } from './storage';
import { RIDE_VISIBILITIES, type RideRecord, type RideVisibility } from './types';

const LAST_VISIBILITY_KEY = 'lastVisibility';
/** First ride is private; afterwards the last choice is remembered (decision 2026-10-07). */
const FIRST_RIDE_VISIBILITY: RideVisibility = 'private';

/** The editable part of a ride ("Sürüşü kaydet" 08.05, "Sürüşü düzenle" 09.07). */
export type RideDetailsInput = Pick<
  RideRecord,
  'title' | 'notes' | 'rideType' | 'difficulty' | 'surface' | 'visibility' | 'photos'
>;

/**
 * Rides on this device. Saving is local first (P0): `saved` means persisted here; `synced` stays
 * false until the self-hosted backend exists.
 */
export const ridesRepository = {
  get: (id: string) => rideStorage.get(id),
  listSaved: () => rideStorage.list('saved'),
  listDrafts: () => rideStorage.list('draft'),
  /** An unfinished recording left by a crash or a killed app (08.03). */
  async findInterrupted() {
    const [ride] = await rideStorage.list('recording');
    return ride ?? null;
  },
  put: (ride: RideRecord) => rideStorage.put(ride),

  async update(id: string, patch: Partial<RideRecord>) {
    const ride = await rideStorage.get(id);
    if (!ride) {
      throw new Error(`Ride ${id} not found`);
    }
    const next: RideRecord = { ...ride, ...patch, updatedAt: Date.now() };
    await rideStorage.put(next);
    return next;
  },

  /** "Sürüşü kaydet": the draft becomes a saved ride and its visibility the next default. */
  async save(id: string, details: RideDetailsInput) {
    const ride = await ridesRepository.update(id, { ...details, status: 'saved' });
    await rideStorage.setPreference(LAST_VISIBILITY_KEY, details.visibility);
    return ride;
  },

  remove: (id: string) => rideStorage.remove(id),

  async defaultVisibility(): Promise<RideVisibility> {
    const stored = await rideStorage.getPreference(LAST_VISIBILITY_KEY);
    return RIDE_VISIBILITIES.find((item) => item === stored) ?? FIRST_RIDE_VISIBILITY;
  },
};
