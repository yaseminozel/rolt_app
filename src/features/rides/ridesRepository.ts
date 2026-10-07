import type { CompletedRide } from './completedRide';
import { countCurves } from './rideRecorder';
import { nearestCityName } from './rideTitle';
import type { RideType } from './rideTypes';
import { rideStorage } from './storage';
import { RIDE_VISIBILITIES, type RideRecord, type RideVisibility } from './types';
import type { Route, RouteTag } from '@/features/routes/types';

/** Ride type a route ride starts with; the rider can change it on the form. */
const RIDE_TYPE_FOR_TAG: Record<RouteTag, RideType> = {
  coast: 'coast',
  curvy: 'curves',
  scenic: 'nature',
  nature: 'nature',
  city: 'city',
  offRoad: 'offRoad',
  longTour: 'longRide',
};

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

  /** A ride that ended in navigation (06.07 / "Bitir") becomes a draft for "Sürüşü kaydet". */
  async createDraftFromNavigation(ride: CompletedRide, route: Route) {
    const track = ride.track.length > 1 ? [ride.track] : [];
    const draft: RideRecord = {
      id: `ride-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'draft',
      rideType: RIDE_TYPE_FOR_TAG[route.tag],
      routeId: route.id,
      routeName: route.name,
      title: '',
      notes: '',
      difficulty: route.difficulty,
      surface: route.surface,
      visibility: await ridesRepository.defaultVisibility(),
      photos: [],
      city: ride.track[0] ? nearestCityName(ride.track[0]) : undefined,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      updatedAt: Date.now(),
      stats: {
        distanceM: ride.distanceM,
        // Recorded time as in the Record tab: riding plus breaks.
        durationS: ride.movingS + ride.breakS,
        breakS: ride.breakS,
        breakCount: ride.breakCount,
        maxSpeedMps: ride.maxSpeedMps,
        curveCount: countCurves(track),
      },
      track,
      synced: false,
    };
    await rideStorage.put(draft);
    return draft;
  },

  async defaultVisibility(): Promise<RideVisibility> {
    const stored = await rideStorage.getPreference(LAST_VISIBILITY_KEY);
    return RIDE_VISIBILITIES.find((item) => item === stored) ?? FIRST_RIDE_VISIBILITY;
  },
};
