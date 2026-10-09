import { requireUserId } from '@/lib/supabase/client';
import { contentTypeOf, newObjectPath, removeFiles, uploadFile } from '@/lib/supabase/storage';

import type { RoutePhotoUploader } from './types';

/** Suggestion photos stay private (reviewers read them with the service role). */
const BUCKET = 'suggestion-photos';

/** Uploads to `suggestion-photos/<user id>/…` (Storage RLS) with real progress. */
export const supabasePhotoUploader: RoutePhotoUploader = {
  async upload(uri, { onProgress }) {
    const userId = await requireUserId();
    const contentType = contentTypeOf(uri);
    return uploadFile(BUCKET, newObjectPath(userId, contentType), uri, { contentType, onProgress });
  },

  async remove(storagePath) {
    await removeFiles(BUCKET, [storagePath]);
  },
};
