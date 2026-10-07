import { hasMapboxToken } from '@/features/route-suggestion/services/mapboxConfig';

import { mapboxStopSearch } from './mapboxStopSearch';
import { mockStopSearch } from './mockStopSearch';
import type { StopSearchService } from './stopSearch';

/** Stop search: Mapbox Search Box with a token, the design's mock places otherwise. */
export const stopSearch: StopSearchService = hasMapboxToken ? mapboxStopSearch : mockStopSearch;

export * from './stopSearch';
