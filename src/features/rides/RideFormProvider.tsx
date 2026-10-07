import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { uploadRidePhoto } from './mockRidePhotoUploader';
import { formValuesFromRide, RIDE_PHOTOS_MAX, type RideFormValues } from './rideForm';
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
};

const RideFormContext = createContext<RideFormValue | null>(null);

const newPhotoId = () =>
  `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * The editable details of one ride, shared by the save / edit form (08.05, 09.07) and the sheets
 * it opens (sürüş tipi, görünürlük, fotoğraf, zorluk, yol tipi). Photos upload as soon as they
 * are added; the form waits for them before saving.
 */
export function RideFormProvider({ ride, children }: { ride: RideRecord; children: ReactNode }) {
  const [state, setState] = useState(() => ({ rideId: ride.id, values: formValuesFromRide(ride) }));
  // Another ride (or a newly loaded one): start from its stored details.
  if (state.rideId !== ride.id) {
    setState({ rideId: ride.id, values: formValuesFromRide(ride) });
  }
  const values = state.values;

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
      uploadRidePhoto(uri, (progress) => setPhoto(photoId, { progress }), isRetry)
        .then(() => setPhoto(photoId, { status: 'uploaded', progress: 1 }))
        .catch(() => setPhoto(photoId, { status: 'failed' }));
    },
    [setPhoto],
  );

  const addPhotos = useCallback(
    (uris: string[]) => {
      const room = RIDE_PHOTOS_MAX - values.photos.length;
      const added: RidePhoto[] = uris
        .slice(0, Math.max(room, 0))
        .map((uri) => ({ id: newPhotoId(), uri, status: 'uploading', progress: 0 }));
      update((current) => ({ ...current, photos: [...current.photos, ...added] }));
      added.forEach((photo) => startUpload(photo.id, photo.uri, false));
    },
    [startUpload, update, values.photos.length],
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
    (photoId: string) =>
      update((current) => ({
        ...current,
        photos: current.photos.filter((photo) => photo.id !== photoId),
      })),
    [update],
  );

  const reset = useCallback(
    () => setState({ rideId: ride.id, values: formValuesFromRide(ride) }),
    [ride],
  );

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
    }),
    [addPhotos, removePhoto, reset, retryPhoto, ride, setValue, values],
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
