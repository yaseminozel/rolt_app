import type { LngLat } from '@/features/routes/types';

import type { RoutePhotoSuggestion } from './routePhotoLibrary';

/** Web preview: no device photo library, so the suggestions section stays hidden. */
export async function findPhotosAlongLine(
  _line: readonly LngLat[],
  _isCancelled: () => boolean,
): Promise<RoutePhotoSuggestion[]> {
  return [];
}

export async function resolveSuggestionUri(suggestion: RoutePhotoSuggestion) {
  return suggestion.id;
}
