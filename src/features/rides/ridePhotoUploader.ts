import { currentUserId, hasSupabase } from '@/lib/supabase/client';

import { uploadRidePhoto as mockUploadRidePhoto } from './mockRidePhotoUploader';
import { uploadRidePhotoFile } from './sync/rideUpload';

/**
 * Uploads a photo picked on the save / edit form (08.07) to `ride-photos/<uid>/<ride id>/…`
 * with real progress and resolves with its storage path. Without Supabase (Expo Go demos) the
 * mock runs and there is no path. A failure leaves the photo "failed" for "Tekrar dene".
 */
export async function uploadRidePhoto(
  rideId: string,
  uri: string,
  onProgress: (progress: number) => void,
  isRetry: boolean,
): Promise<string | undefined> {
  if (!hasSupabase) {
    await mockUploadRidePhoto(uri, onProgress, isRetry);
    return undefined;
  }
  const userId = await currentUserId();
  if (!userId) {
    // Saving a ride needs an account; an expired session offline fails like the network.
    throw new Error('Not signed in');
  }
  return uploadRidePhotoFile(userId, rideId, uri, onProgress);
}
