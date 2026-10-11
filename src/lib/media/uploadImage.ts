import {
  contentTypeOf,
  newObjectPath,
  type StorageBucket,
  uploadFile,
  type UploadOptions,
} from '@/lib/supabase/storage';

import {
  discardPreparedImage,
  prepareImage,
  type ImagePreset,
  type PrepareImageOptions,
} from './prepareImage';

export type UploadImageOptions = PrepareImageOptions & {
  preset?: ImagePreset;
  /** Folder inside the user's own (`<user id>/<prefix>/…`). */
  prefix?: string;
  onProgress?: UploadOptions['onProgress'];
};

/**
 * Uploads a local image to `<bucket>/<user id>/[prefix/]<random>.jpg` after `prepareImage`
 * (resized, upright, JPEG without metadata) and resolves with the stored path. If preparing fails
 * the original goes with its own type; the bucket's size limit stays the server-side guard.
 */
export async function uploadImage(
  bucket: StorageBucket,
  userId: string,
  uri: string,
  { preset = 'photo', prefix, onProgress, skipWhenSmall }: UploadImageOptions = {},
): Promise<string> {
  const image = await prepareImage(uri, preset, { skipWhenSmall });
  try {
    const contentType = contentTypeOf(image.uri);
    return await uploadFile(bucket, newObjectPath(userId, contentType, prefix), image.uri, {
      contentType,
      onProgress,
    });
  } finally {
    discardPreparedImage(image);
  }
}
