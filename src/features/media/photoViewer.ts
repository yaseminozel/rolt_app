import { router } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';

export type ViewerPhoto = ImageSourcePropType;

type ViewerState = { photos: readonly ViewerPhoto[]; index: number };

/**
 * Photos for the full-screen viewer (`/photo-viewer`). Sources can be `require()` numbers or
 * `{ uri }` objects, which aren't route params, so they wait here until the screen reads them.
 */
let pending: ViewerState | null = null;
let openedAt = 0;

/** A second tap while the viewer is opening is the same request. */
const REOPEN_GAP_MS = 600;

/** Opens the full-screen viewer at `index` (clamped to the list). */
export function openPhotoViewer(photos: readonly ViewerPhoto[], index = 0) {
  const now = Date.now();
  if (photos.length === 0 || now - openedAt < REOPEN_GAP_MS) {
    return;
  }
  openedAt = now;
  pending = { photos, index: Math.min(Math.max(index, 0), photos.length - 1) };
  router.push('/photo-viewer');
}

/** What the viewer shows; null after a reload or a direct link (nothing to show). */
export function peekPhotoViewer(): ViewerState | null {
  return pending;
}

/** Drops the photos once the viewer closes. */
export function clearPhotoViewer() {
  pending = null;
}
