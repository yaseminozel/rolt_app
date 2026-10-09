import type { CompletedRide } from './completedRide';
import { deleteRidePhotoCopy, deleteRidePhotoFolder } from './ridePhotoFiles';
import { countCurves, type TrackPoint } from './rideRecorder';
import { nearestCityName } from './rideTitle';
import type { RideType } from './rideTypes';
import { rideStorage } from './storage';
import { addPendingDelete } from './sync/pendingDeletes';
import { requestRideSync } from './sync/rideSync';
import { changeRideSetting } from './sync/settingsChanges';
import type { RidePhoto, RideRecord, RideVisibility } from './types';
import { readDefaultVisibility, storeDefaultVisibility } from './visibilityPreference';
import type { Route, RouteTag } from '@/features/routes/types';
import { hasSupabase } from '@/lib/supabase/client';

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

/** The editable part of a ride ("Sürüşü kaydet" 08.05, "Sürüşü düzenle" 09.07). */
export type RideDetailsInput = Pick<
  RideRecord,
  'title' | 'notes' | 'rideType' | 'difficulty' | 'surface' | 'visibility' | 'photos'
>;

/**
 * Whether `viewerId` (the signed-in account, null for guests) may see a stored ride: saved rides
 * belong to the account that saved them; recordings, drafts and rides saved before accounts
 * have no owner yet.
 */
const visibleTo = (ride: RideRecord, viewerId: string | null | undefined) =>
  !ride.ownerId || ride.ownerId === viewerId;

/** The account whose storage folder holds a ride's photos (a draft has photos but no owner). */
const photoOwner = (ride: RideRecord) => ride.photos.find((photo) => photo.path)?.path?.split('/')[0];

/**
 * Photos of an edit form opened before a background sync uploaded them: they take the stored
 * path, so the same file isn't uploaded twice.
 */
function withStoredPaths(photos: RidePhoto[], stored: RidePhoto[]) {
  return photos.map((photo) => {
    const match = photo.path ? undefined : stored.find((item) => item.id === photo.id && item.path);
    return match
      ? { ...photo, path: match.path, status: match.status, progress: match.progress, failure: undefined }
      : photo;
  });
}

/**
 * Rides on this device. Saving is local first (P0): `saved` means persisted here. Signed in with
 * Supabase, every save, edit and delete then requests a background sync (`sync/rideSync.ts`);
 * `synced` turns true once the server has the ride and its photos.
 */
export const ridesRepository = {
  async get(id: string, viewerId?: string | null) {
    const ride = await rideStorage.get(id);
    return ride && visibleTo(ride, viewerId) ? ride : null;
  },
  /** The viewer's saved rides, newest first. */
  async listSaved(viewerId?: string | null) {
    const rides = await rideStorage.list('saved');
    return rides.filter((ride) => visibleTo(ride, viewerId));
  },
  listDrafts: () => rideStorage.list('draft'),
  /** An unfinished recording left by a crash or a killed app (08.03). */
  async findInterrupted() {
    const [ride] = await rideStorage.list('recording');
    return ride ?? null;
  },
  put: (ride: RideRecord) => rideStorage.put(ride),
  /** While recording: the record (stats, state) plus only the new track points (P0, small writes). */
  appendRecording: (ride: RideRecord, points: TrackPoint[]) => rideStorage.appendRecording(ride, points),
  /** Continuing an interrupted ride: its whole track as points, once. */
  replaceRecording: (ride: RideRecord, points: TrackPoint[]) => rideStorage.replaceRecording(ride, points),

  /**
   * A change by the rider; a saved ride goes to the server again (also one it refused before:
   * the edit may have fixed it).
   */
  async update(id: string, patch: Partial<RideRecord>) {
    const ride = await rideStorage.get(id);
    if (!ride) {
      throw new Error(`Ride ${id} not found`);
    }
    const photos = patch.photos ? withStoredPaths(patch.photos, ride.photos) : ride.photos;
    // Uploaded photos the rider took out are deleted once the server no longer lists them.
    const kept = new Set(photos.map((photo) => photo.path));
    const removedPhotoPaths = [
      ...(ride.removedPhotoPaths ?? []),
      ...ride.photos.flatMap((photo) => (photo.path && !kept.has(photo.path) ? [photo.path] : [])),
    ];
    const next: RideRecord = {
      ...ride,
      ...patch,
      photos,
      removedPhotoPaths: removedPhotoPaths.length > 0 ? removedPhotoPaths : undefined,
      synced: false,
      syncError: undefined,
      updatedAt: Date.now(),
    };
    await rideStorage.put(next);
    // Device copies of photos taken out go once the ride no longer lists them.
    const keptIds = new Set(photos.map((photo) => photo.id));
    ride.photos.forEach((photo) => {
      if (!keptIds.has(photo.id)) {
        deleteRidePhotoCopy(photo.uri);
      }
    });
    if (next.status === 'saved') {
      requestRideSync().catch(() => undefined);
    }
    return next;
  },

  /**
   * "Sürüşü kaydet" (08.05) and "Değişiklikleri kaydet" (09.07): the ride is saved for
   * `ownerId` (the signed-in account) and its visibility becomes the next default.
   */
  async save(id: string, details: RideDetailsInput, ownerId?: string | null) {
    const stored = await rideStorage.get(id);
    const owner = stored?.ownerId ?? ownerId ?? undefined;
    const ride = await ridesRepository.update(id, { ...details, status: 'saved', ownerId: owner });
    // Not awaited: the ride is on the device already, which is all "Kaydedildi" waits for (P0).
    readDefaultVisibility()
      .then((current) =>
        current === details.visibility ? undefined : ridesRepository.setDefaultVisibility(details.visibility),
      )
      .catch(() => undefined);
    return ride;
  },

  /**
   * Deletes a ride and its photo copies from the device. Deleted by its signed-in owner, the server copy and photos
   * go too (queued, so it also works offline); `viewerId` is left out where the account is
   * already gone (account deletion) or nothing was saved (a discarded recording).
   */
  async remove(id: string, viewerId?: string | null) {
    const ride = await rideStorage.get(id);
    const ownerId = ride ? (ride.ownerId ?? photoOwner(ride)) : undefined;
    if (hasSupabase && ride && viewerId && (ownerId === viewerId || (!ownerId && ride.status === 'draft'))) {
      // Queued before the local delete, so a restore can't bring the ride back meanwhile.
      await addPendingDelete({ id, ownerId: viewerId, row: ride.status === 'saved' });
    }
    await rideStorage.remove(id);
    deleteRidePhotoFolder(id);
    if (hasSupabase && viewerId) {
      requestRideSync().catch(() => undefined);
    }
  },

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
        maxLeanLeftDeg: ride.maxLeanLeftDeg,
        maxLeanRightDeg: ride.maxLeanRightDeg,
      },
      track,
      synced: false,
    };
    await rideStorage.put(draft);
    return draft;
  },

  /**
   * "Ayarlar > Sürüş görünürlüğü" (10.04); the save form starts from it. Stored on the device at
   * once; signed in, `user_settings.default_ride_visibility` follows in the background.
   */
  setDefaultVisibility: (visibility: RideVisibility) =>
    changeRideSetting('visibility', () => storeDefaultVisibility(visibility)),

  defaultVisibility: readDefaultVisibility,
};
