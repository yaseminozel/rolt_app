import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { haptics } from '@/features/haptics/haptics';
import { useIsOffline } from '@/features/network/useIsOffline';
import { hasSupabase } from '@/lib/supabase/client';

import { formValuesFromRide, RIDE_PHOTOS_MAX, type RideFormValues } from './rideForm';
import { deleteRidePhotoCopy, keepRidePhoto } from './ridePhotoFiles';
import { uploadRidePhoto } from './ridePhotoUploader';
import { removeRidePhotoFiles } from './sync/rideUpload';
import { isConnectionError } from './sync/syncErrors';
import type { RidePhoto, RideRecord } from './types';

type RideFormValue = {
  ride: RideRecord;
  values: RideFormValues;
  setValue: <K extends keyof RideFormValues>(key: K, value: RideFormValues[K]) => void;
  /** Back to the stored ride (closing "Sürüşü düzenle" without saving). */
  reset: () => void;
  addPhotos: (uris: string[]) => void;
  retryPhoto: (photoId: string) => void;
  removePhoto: (photoId: string) => void;
  /** Free photo slots. */
  photoRoom: number;
  /**
   * Failed photos don't keep the ride from being saved: offline, or every failure was the
   * connection. They stay on the device and go up with the ride's sync. Online, a refused
   * photo still turns "Sürüşü kaydet" off (08.07).
   */
  failedPhotosCanWait: boolean;
};

const RideFormContext = createContext<RideFormValue | null>(null);

const newPhotoId = () =>
  `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * The editable details of one ride, shared by the save / edit form (08.05, 09.07) and the sheets
 * it opens (sürüş tipi, görünürlük, fotoğraf, zorluk, yol tipi). Photos upload as soon as they
 * are added, from the app's own copy (`keepRidePhoto`, so an offline ride keeps them until they
 * are up); the form waits for them before saving. A photo added here and dropped before saving
 * (removed, or the edit closed) loses its upload and copy at once; one the stored ride already
 * had goes after the edited ride is saved (copy) and uploaded (`removedPhotoPaths`).
 */
export function RideFormProvider({ ride, children }: { ride: RideRecord; children: ReactNode }) {
  const [state, setState] = useState(() => ({ rideId: ride.id, values: formValuesFromRide(ride) }));
  // Another ride (or a newly loaded one): start from its stored details.
  if (state.rideId !== ride.id) {
    setState({ rideId: ride.id, values: formValuesFromRide(ride) });
  }
  const values = state.values;
  const offline = useIsOffline();
  /** Photos dropped from the form while their upload may still be running. */
  const droppedRef = useRef(new Set<string>());
  const storedPaths = useMemo(
    () => new Set(ride.photos.flatMap((photo) => (photo.path ? [photo.path] : []))),
    [ride.photos],
  );

  const storedIds = useMemo(() => new Set(ride.photos.map((photo) => photo.id)), [ride.photos]);

  /** Deletes uploads and device copies that never became part of the stored ride (best effort). */
  const discardUploads = useCallback((photos: RidePhoto[]) => {
    const paths = photos.flatMap((photo) =>
      photo.path && !storedPaths.has(photo.path) ? [photo.path] : [],
    );
    if (paths.length > 0) {
      removeRidePhotoFiles(paths).catch(() => undefined);
    }
    photos.forEach((photo) => {
      if (!storedIds.has(photo.id)) {
        deleteRidePhotoCopy(photo.uri);
      }
    });
  }, [storedIds, storedPaths]);

  const update = useCallback((patch: (values: RideFormValues) => RideFormValues) => {
    setState((current) => ({ ...current, values: patch(current.values) }));
  }, []);

  const setValue = useCallback(
    <K extends keyof RideFormValues>(key: K, value: RideFormValues[K]) =>
      update((current) => ({ ...current, [key]: value })),
    [update],
  );

  const setPhoto = useCallback(
    (photoId: string, patch: Partial<RidePhoto>) =>
      update((current) => ({
        ...current,
        photos: current.photos.map((photo) =>
          photo.id === photoId ? { ...photo, ...patch } : photo,
        ),
      })),
    [update],
  );

  const startUpload = useCallback(
    (photoId: string, uri: string, isRetry: boolean) => {
      setPhoto(photoId, { status: 'uploading', progress: 0 });
      uploadRidePhoto(ride.id, uri, (progress) => setPhoto(photoId, { progress }), isRetry)
        .then((path) => {
          if (droppedRef.current.has(photoId)) {
            discardUploads([{ id: photoId, uri, status: 'uploaded', progress: 1, path }]);
            return;
          }
          setPhoto(photoId, { status: 'uploaded', progress: 1, path, failure: undefined });
        })
        .catch((error: unknown) => {
          haptics.error();
          setPhoto(photoId, {
            status: 'failed',
            failure: isConnectionError(error) ? 'connection' : 'rejected',
          });
        });
    },
    [discardUploads, ride.id, setPhoto],
  );

  const addPhotos = useCallback(
    (uris: string[]) => {
      const room = RIDE_PHOTOS_MAX - values.photos.length;
      const added: RidePhoto[] = uris
        .slice(0, Math.max(room, 0))
        .map((uri) => ({ id: newPhotoId(), uri, status: 'uploading', progress: 0 }));
      update((current) => ({ ...current, photos: [...current.photos, ...added] }));
      added.forEach((photo) => {
        // Prepared and copied first (local, under a second), so the upload and the ride use the
        // kept, small file.
        keepRidePhoto(ride.id, photo.id, photo.uri).then((uri) => {
          if (droppedRef.current.has(photo.id)) {
            deleteRidePhotoCopy(uri);
            return;
          }
          setPhoto(photo.id, { uri });
          startUpload(photo.id, uri, false);
        });
      });
    },
    [ride.id, setPhoto, startUpload, update, values.photos.length],
  );

  const retryPhoto = useCallback(
    (photoId: string) => {
      const photo = values.photos.find((item) => item.id === photoId);
      if (photo) {
        startUpload(photo.id, photo.uri, true);
      }
    },
    [startUpload, values.photos],
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      droppedRef.current.add(photoId);
      discardUploads(values.photos.filter((photo) => photo.id === photoId));
      update((current) => ({
        ...current,
        photos: current.photos.filter((photo) => photo.id !== photoId),
      }));
    },
    [discardUploads, update, values.photos],
  );

  const reset = useCallback(() => {
    values.photos.forEach((photo) => droppedRef.current.add(photo.id));
    discardUploads(values.photos);
    setState({ rideId: ride.id, values: formValuesFromRide(ride) });
  }, [discardUploads, ride, values.photos]);

  const value = useMemo<RideFormValue>(
    () => ({
      ride,
      values,
      setValue,
      reset,
      addPhotos,
      retryPhoto,
      removePhoto,
      photoRoom: RIDE_PHOTOS_MAX - values.photos.length,
      failedPhotosCanWait:
        hasSupabase &&
        (offline ||
          values.photos.every((photo) => photo.status !== 'failed' || photo.failure === 'connection')),
    }),
    [addPhotos, offline, removePhoto, reset, retryPhoto, ride, setValue, values],
  );

  return <RideFormContext.Provider value={value}>{children}</RideFormContext.Provider>;
}

export function useRideForm() {
  const value = useContext(RideFormContext);
  if (!value) {
    throw new Error('useRideForm must be used inside RideFormProvider');
  }
  return value;
}
