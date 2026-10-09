/**
 * Where a ride photo's device copy lives: `<documents>/ride-photos/<ride id>/<photo id>.<ext>`.
 * Pure string helpers (no native module), shared by `ridePhotoFiles` and its checks.
 */
export const RIDE_PHOTO_DIR = 'ride-photos';

const MARKER = `/${RIDE_PHOTO_DIR}/`;

/** File extension of a picked image; picker photos are JPEG unless the name says otherwise. */
export function photoExtension(uri: string) {
  const extension = uri.split('?')[0].split('#')[0].split('/').pop()?.split('.');
  const value = extension && extension.length > 1 ? extension.pop()?.toLowerCase() : undefined;
  switch (value) {
    case 'png':
    case 'webp':
    case 'heic':
      return value;
    case 'heif':
      return 'heic';
    default:
      return 'jpg';
  }
}

/** File name of a photo's copy: by photo id, so removing it never needs the stored uri. */
export const ridePhotoFileName = (photoId: string, uri: string) =>
  `${photoId.replace(/[^A-Za-z0-9_-]/g, '_')}.${photoExtension(uri)}`;

const withSlash = (uri: string) => (uri.endsWith('/') ? uri : `${uri}/`);

/** Whether `uri` is a copy kept by the app under `documentUri` (not the picker's cache). */
export const isRidePhotoCopy = (uri: string, documentUri: string) =>
  uri.startsWith(`${withSlash(documentUri)}${RIDE_PHOTO_DIR}/`);

/**
 * iOS moves the app's container on updates and reinstalls from a backup, so a stored absolute
 * path to a copy can point at the old container. A `file:` uri of the form
 * `…/ride-photos/<ride id>/<file>` is put back under the current document directory; any other
 * uri (picker cache, public URL) is returned as is.
 */
export function reanchorRidePhotoUri(uri: string, documentUri: string) {
  if (!uri.startsWith('file:') || isRidePhotoCopy(uri, documentUri)) {
    return uri;
  }
  const index = uri.lastIndexOf(MARKER);
  if (index < 0) {
    return uri;
  }
  const tail = uri.slice(index + 1);
  // Exactly `ride-photos/<ride id>/<file>`.
  if (tail.split('/').length !== 3) {
    return uri;
  }
  return `${withSlash(documentUri)}${tail}`;
}
