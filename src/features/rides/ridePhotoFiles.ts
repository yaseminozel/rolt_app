import { Directory, File, Paths } from 'expo-file-system';

import {
  isRidePhotoCopy,
  reanchorRidePhotoUri,
  RIDE_PHOTO_DIR,
  ridePhotoFileName,
} from './ridePhotoPaths';
import type { RidePhoto } from './types';

/**
 * Device copies of ride photos (08.07, P0). The picker hands over a file in its cache, which iOS
 * may purge before an offline ride syncs, so every added photo is copied to
 * `<documents>/ride-photos/<ride id>/<photo id>.<ext>` and the ride keeps that uri. Copies go
 * with the photo (removed from the ride) or the ride (deleted); an uploaded photo keeps its copy,
 * so the ride still shows it offline.
 */
const folder = (rideId: string) => new Directory(Paths.document, RIDE_PHOTO_DIR, rideId);

/** Resolves with the copy's uri; if copying fails (e.g. a full disk) with the picked uri. */
export async function keepRidePhoto(rideId: string, photoId: string, uri: string): Promise<string> {
  try {
    if (!uri.startsWith('file:') || isRidePhotoCopy(uri, Paths.document.uri)) {
      return uri;
    }
    const directory = folder(rideId);
    directory.create({ intermediates: true, idempotent: true });
    const target = new File(directory, ridePhotoFileName(photoId, uri));
    await new File(uri).copy(target, { overwrite: true });
    // Spelled like `Paths.document` (e.g. /var vs /private/var), so `isRidePhotoCopy` knows it.
    return reanchorRidePhotoUri(target.uri, Paths.document.uri);
  } catch (error) {
    if (__DEV__) {
      console.warn('ride photo copy failed', error);
    }
    return uri;
  }
}

/** Deletes a photo's copy (best effort; picker and remote uris are left alone). */
export function deleteRidePhotoCopy(uri: string) {
  try {
    const documentUri = Paths.document.uri;
    const own = reanchorRidePhotoUri(uri, documentUri);
    if (!isRidePhotoCopy(own, documentUri)) {
      return;
    }
    const file = new File(own);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Left for the folder cleanup.
  }
}

/** Deletes every copy of a ride's photos. */
export function deleteRidePhotoFolder(rideId: string) {
  try {
    const directory = folder(rideId);
    if (directory.exists) {
      directory.delete();
    }
  } catch {
    // A leftover folder is removed by the next sweep.
  }
}

/** Ride ids that have a photo folder on this device. */
export function listRidePhotoFolders(): string[] {
  try {
    const root = new Directory(Paths.document, RIDE_PHOTO_DIR);
    if (!root.exists) {
      return [];
    }
    return root.list().flatMap((item) => (item instanceof Directory ? [item.name] : []));
  } catch {
    return [];
  }
}

/** True for a local photo file that is gone (it can never be uploaded or shown again). */
export function isLocalPhotoMissing(uri: string) {
  if (!uri.startsWith('file:')) {
    return false;
  }
  try {
    return !new File(uri).exists;
  } catch {
    return false;
  }
}

/** A stored ride's photo copies under the current app container (see `reanchorRidePhotoUri`). */
export function reanchorRidePhotos<T extends { photos: RidePhoto[] }>(ride: T): T {
  if (ride.photos.length === 0) {
    return ride;
  }
  let documentUri: string;
  try {
    documentUri = Paths.document.uri;
  } catch {
    return ride;
  }
  let changed = false;
  const photos = ride.photos.map((photo) => {
    const uri = reanchorRidePhotoUri(photo.uri, documentUri);
    if (uri === photo.uri) {
      return photo;
    }
    changed = true;
    return { ...photo, uri };
  });
  return changed ? { ...ride, photos } : ride;
}
