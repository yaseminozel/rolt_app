import type { ImageSourcePropType } from 'react-native';

import { supabase, supabaseAnonKey, supabaseUrl } from './client';

export type StorageBucket =
  | 'avatars'
  | 'ride-photos'
  | 'post-photos'
  | 'route-photos'
  | 'suggestion-photos'
  | 'feedback'
  | 'public-assets';

/** Thumbnail sizes served by the storage image transformer (imgproxy). */
export type ImageSize = 'thumb' | 'card' | 'full';
const WIDTHS: Record<Exclude<ImageSize, 'full'>, number> = { thumb: 160, card: 720 };

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/**
 * URL of a file in a public bucket. `thumb` / `card` ask the image transformer for a resized WebP
 * (lists and cards stay light); `full` is the original.
 */
export function publicUrl(bucket: StorageBucket, path: string, size: ImageSize = 'full') {
  if (/^(https?|file|data):/.test(path)) {
    return path;
  }
  if (size === 'full') {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
  }
  return `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${encodePath(path)}?width=${WIDTHS[size]}&resize=contain&quality=80`;
}

const RENDER_PATH = '/storage/v1/render/image/public/';
const OBJECT_PATH = '/storage/v1/object/public/';

/**
 * The original file behind a resized (`thumb` / `card`) public URL, for full-screen viewing.
 * Any other URL (already original, local file, another host) is returned as is.
 */
export function originalImageUrl(url: string) {
  if (!url.includes(RENDER_PATH)) {
    return url;
  }
  return url.replace(RENDER_PATH, OBJECT_PATH).split('?')[0];
}

/** `publicUrl` as an image source, or undefined without a path. */
export function imageSource(
  bucket: StorageBucket,
  path: string | null | undefined,
  size: ImageSize = 'full',
): ImageSourcePropType | undefined {
  return path ? { uri: publicUrl(bucket, path, size) } : undefined;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** Guesses the image type from a local file name; photos from the picker are JPEG by default. */
export function contentTypeOf(uri: string) {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/** A new object path inside the user's own folder (`<user id>/<random>.<ext>`), as RLS requires. */
export function newObjectPath(userId: string, contentType: string, prefix?: string) {
  const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `${random}.${EXTENSIONS[contentType] ?? 'jpg'}`;
  return prefix ? `${userId}/${prefix}/${name}` : `${userId}/${name}`;
}

export type UploadOptions = {
  contentType?: string;
  /** 0–1 as bytes go out. */
  onProgress?: (fraction: number) => void;
  /** Replace an existing object at the same path. */
  upsert?: boolean;
};

/**
 * Uploads a local file (`file://…` from the camera or picker) to Storage with real progress.
 * Uses XMLHttpRequest + FormData, which streams the file from disk on iOS and Android instead of
 * reading it into JS memory. Resolves with the stored path.
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  uri: string,
  { contentType = contentTypeOf(uri), onProgress, upsert = false }: UploadOptions = {},
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? supabaseAnonKey;
  const form = new FormData();
  // React Native's FormData accepts a file descriptor object.
  form.append('file', { uri, name: path.split('/').pop() ?? 'upload', type: contentType } as unknown as Blob);

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${encodePath(path)}`);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.setRequestHeader('apikey', supabaseAnonKey);
    request.setRequestHeader('x-upsert', upsert ? 'true' : 'false');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(event.loaded / event.total, 0.99));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (${request.status}): ${request.responseText}`));
      }
    };
    request.onerror = () => reject(new Error('Upload failed: network error'));
    request.ontimeout = () => reject(new Error('Upload failed: timeout'));
    request.timeout = 120_000;
    request.send(form);
  });
  return path;
}

/** Removes files the user owns; missing files are ignored. */
export async function removeFiles(bucket: StorageBucket, paths: string[]) {
  if (paths.length > 0) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

/** A short-lived URL for a file in a private bucket (own suggestion / feedback photos). */
export async function signedUrl(bucket: StorageBucket, path: string, expiresInS = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInS);
  if (error) {
    throw error;
  }
  return data.signedUrl;
}
