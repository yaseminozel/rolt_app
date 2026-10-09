import type { RidePhoto } from './types';

/** Web preview: picked photos are blob / data uris that can't be copied, so nothing is kept. */
export const keepRidePhoto = async (_rideId: string, _photoId: string, uri: string) => uri;

export function deleteRidePhotoCopy(_uri: string) {}

export function deleteRidePhotoFolder(_rideId: string) {}

export const listRidePhotoFolders = (): string[] => [];

export const isLocalPhotoMissing = (_uri: string) => false;

export const reanchorRidePhotos = <T extends { photos: RidePhoto[] }>(ride: T): T => ride;
