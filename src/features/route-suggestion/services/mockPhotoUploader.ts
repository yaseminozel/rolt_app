import type { RoutePhotoUploader } from './types';

/**
 * MOCK photo upload (without Supabase). Each photo takes ~1.2 s; every 4th photo added in a
 * session fails once so the "1 fotoğraf yüklenemedi · Tekrar" state (04.2, fGq4D) can be seen.
 */
let uploadCount = 0;

const UPLOAD_MS = 1200;
const PROGRESS_STEPS = 4;

export const mockPhotoUploader: RoutePhotoUploader = {
  async upload(uri, { isRetry, onProgress }) {
    uploadCount += 1;
    const shouldFail = !isRetry && uploadCount % 4 === 0;
    for (let step = 1; step <= PROGRESS_STEPS; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, UPLOAD_MS / PROGRESS_STEPS));
      onProgress?.(step / PROGRESS_STEPS);
    }
    if (shouldFail) {
      throw new Error('Mock upload failure');
    }
    return `mock/${uploadCount}-${uri.split('/').pop() ?? 'photo.jpg'}`;
  },

  async remove() {},
};
