import type { Json } from '@/lib/supabase/database.types';
import { supabase, unwrap } from '@/lib/supabase/client';
import { contentTypeOf, newObjectPath, removeFiles, uploadFile } from '@/lib/supabase/storage';

import { isLocalPhotoMissing } from '../ridePhotoFiles';
import { rideStorage } from '../storage';
import type { RidePhoto, RideRecord } from '../types';
import type { PendingRideDelete } from './pendingDeletes';
import type { SyncErrorInfo } from './syncErrors';

const BUCKET = 'ride-photos';
/** A ride has at most 10 photos (08.05); the folder listing only needs to cover leftovers too. */
const FOLDER_LIST_LIMIT = 100;

/** Folder of a ride's photos; storage RLS needs the owner first. */
export const ridePhotoFolder = (ownerId: string, rideId: string) => `${ownerId}/${rideId}`;

/** A new object path for a photo of `rideId`: `<owner>/<ride id>/<random>.<ext>`. */
export const newRidePhotoPath = (ownerId: string, rideId: string, uri: string) =>
  newObjectPath(ownerId, contentTypeOf(uri), rideId);

export async function uploadRidePhotoFile(
  ownerId: string,
  rideId: string,
  uri: string,
  onProgress?: (fraction: number) => void,
) {
  return uploadFile(BUCKET, newRidePhotoPath(ownerId, rideId, uri), uri, { onProgress });
}

/** Best effort: a leftover object costs storage, never a ride. */
export async function removeRidePhotoFiles(paths: string[]) {
  try {
    await removeFiles(BUCKET, paths);
  } catch {
    // Left for the next folder cleanup of the ride.
  }
}

/**
 * `upsert_ride`'s input (0003_rides.sql): the device record as is (times in ms, stats, the track
 * as segments of [lng, lat]) with the uploaded photos' paths in the rider's order. An empty title
 * stays empty: readers build the automatic title from `city` and `startedAt` in their language.
 */
export function rideUploadPayload(ride: RideRecord, photoPaths: string[]) {
  const payload = {
    id: ride.id,
    routeId: ride.routeId ?? null,
    routeName: ride.routeName ?? null,
    title: ride.title.trim(),
    notes: ride.notes,
    rideType: ride.rideType,
    difficulty: ride.difficulty,
    surface: ride.surface,
    visibility: ride.visibility,
    city: ride.city ?? null,
    startedAt: ride.startedAt,
    endedAt: ride.endedAt ?? null,
    stats: {
      distanceM: ride.stats.distanceM,
      durationS: ride.stats.durationS,
      breakS: ride.stats.breakS,
      breakCount: ride.stats.breakCount,
      maxSpeedMps: ride.stats.maxSpeedMps,
      curveCount: ride.stats.curveCount,
      maxLeanLeftDeg: ride.stats.maxLeanLeftDeg ?? null,
      maxLeanRightDeg: ride.stats.maxLeanRightDeg ?? null,
    },
    track: ride.track,
    photoPaths,
  };
  return payload satisfies Json;
}

/**
 * Uploads one saved ride: photos still without a storage path first (saved offline after a
 * failed upload, or added before the backend existed), then the row and track. Photo paths are
 * kept on the device as soon as they exist, so a failed pass never uploads a photo twice; a
 * local photo whose file is gone is dropped (nothing is left to send or show). The ride is
 * marked `synced` only if it wasn't edited meanwhile; resolves false when it has to go again.
 */
export async function uploadRide(ride: RideRecord, ownerId: string): Promise<boolean> {
  let photos: RidePhoto[] = ride.photos;
  const lost = new Set<string>();
  for (const photo of ride.photos) {
    if (photo.path || !/^file:/.test(photo.uri)) {
      continue;
    }
    if (isLocalPhotoMissing(photo.uri)) {
      lost.add(photo.id);
      if (__DEV__) {
        console.warn('ride sync: photo file missing, dropped', ride.id, photo.id);
      }
      continue;
    }
    const path = await uploadRidePhotoFile(ownerId, ride.id, photo.uri);
    photos = photos.map((item) => (item.id === photo.id ? asUploaded(item, path) : item));
    await patchStored(ride.id, (stored) => ({ ...stored, photos: withPaths(stored.photos, photos) }));
  }
  photos = photos.filter((photo) => !lost.has(photo.id));

  const photoPaths = photos.flatMap((photo) => (photo.path ? [photo.path] : []));
  unwrap(await supabase.rpc('upsert_ride', { p_ride: rideUploadPayload(ride, photoPaths) }));

  // Photos the rider removed in an edit go once the server no longer lists them.
  if (ride.removedPhotoPaths?.length) {
    await removeRidePhotoFiles(ride.removedPhotoPaths);
  }
  const uploadedAt = Date.now();
  let done = false;
  await patchStored(ride.id, (stored) => {
    done = stored.updatedAt === ride.updatedAt;
    const removed = new Set(ride.removedPhotoPaths ?? []);
    const pendingRemovals = (stored.removedPhotoPaths ?? []).filter((path) => !removed.has(path));
    return {
      ...stored,
      photos: withPaths(stored.photos, photos).filter((photo) => !lost.has(photo.id)),
      removedPhotoPaths: pendingRemovals.length > 0 ? pendingRemovals : undefined,
      synced: done,
      uploadedAt,
    };
  });
  return done;
}

/**
 * The server refused `ride` for good (`classifySyncError`): it stays on the device, marked, and
 * sync skips it until the rider edits it. Not marked if it was edited meanwhile (that version
 * gets its own try).
 */
export async function markRideSyncError(ride: RideRecord, error: SyncErrorInfo) {
  await patchStored(ride.id, (stored) =>
    stored.updatedAt === ride.updatedAt ? { ...stored, syncError: { ...error, at: Date.now() } } : stored,
  );
}

/** Deletes a ride's row (if it was saved) and its photo folder on the server. */
export async function deleteRemoteRide({ id, ownerId, row }: PendingRideDelete) {
  if (row) {
    // RLS: only the owner's row goes (tracks, likes and comments cascade).
    unwrap(await supabase.from('rides').delete().eq('id', id));
  }
  const folder = ridePhotoFolder(ownerId, id);
  const files = unwrap(await supabase.storage.from(BUCKET).list(folder, { limit: FOLDER_LIST_LIMIT }));
  const paths = (files ?? []).filter((file) => file.id !== null).map((file) => `${folder}/${file.name}`);
  if (paths.length > 0) {
    unwrap(await supabase.storage.from(BUCKET).remove(paths));
  }
}

/** An uploaded photo: its storage path, and no longer `failed` (the edit form shows it done). */
function asUploaded({ failure: _failure, ...photo }: RidePhoto, path: string): RidePhoto {
  return { ...photo, path, status: 'uploaded', progress: 1 };
}

function withPaths(stored: RidePhoto[], uploaded: RidePhoto[]) {
  return stored.map((photo) => {
    if (photo.path) {
      return photo;
    }
    const path = uploaded.find((item) => item.id === photo.id)?.path;
    return path ? asUploaded(photo, path) : photo;
  });
}

/** Re-reads the stored ride and rewrites it if it is still there (never resurrects a delete). */
async function patchStored(id: string, patch: (stored: RideRecord) => RideRecord) {
  const stored = await rideStorage.get(id);
  if (stored && stored.status === 'saved') {
    await rideStorage.putIfPresent(patch(stored));
  }
}
