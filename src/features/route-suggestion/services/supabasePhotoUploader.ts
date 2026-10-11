import { uploadImage } from '@/lib/media/uploadImage';
import { requireUserId } from '@/lib/supabase/client';
import { removeFiles } from '@/lib/supabase/storage';

import type { RoutePhotoUploader } from './types';

/** Suggestion photos stay private (reviewers read them with the service role). */
const BUCKET = 'suggestion-photos';

/**
 * Uploads to `suggestion-photos/<user id>/…` (Storage RLS) with real progress, prepared first
 * (≤ 2048 px JPEG without EXIF / GPS).
 */
export const supabasePhotoUploader: RoutePhotoUploader = {
  async upload(uri, { onProgress }) {
    const userId = await requireUserId();
    return uploadImage(BUCKET, userId, uri, { onProgress });
  },

  async remove(storagePath) {
    await removeFiles(BUCKET, [storagePath]);
  },
};
