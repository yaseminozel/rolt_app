import { useEffect, useState } from 'react';

import type { LngLat } from '@/features/routes/types';

import { findPhotosAlongLine, type RoutePhotoSuggestion } from './routePhotoLibrary';

export { resolveSuggestionUri, type RoutePhotoSuggestion } from './routePhotoLibrary';

type State = { status: 'loading' | 'ready'; photos: RoutePhotoSuggestion[] };

/**
 * Recent photos from the device library taken within ~1 km of the route line, newest first.
 * Asks for photo-library access once (only while undetermined); when access is denied, the
 * scan fails or nothing matches, `photos` is empty and the section is hidden.
 */
export function useRoutePhotoSuggestions(line: readonly LngLat[]) {
  const [state, setState] = useState<State>({ status: 'loading', photos: [] });
  const lineKey = line.length > 0 ? `${line.length}:${line[0].join(',')}:${line[line.length - 1].join(',')}` : '';

  useEffect(() => {
    let cancelled = false;
    findPhotosAlongLine(line, () => cancelled)
      .catch(() => [])
      .then((photos) => {
        if (!cancelled) {
          setState({ status: 'ready', photos });
        }
      });
    return () => {
      cancelled = true;
    };
    // The line is re-read only when it actually changes (see `lineKey`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey]);

  return state;
}

