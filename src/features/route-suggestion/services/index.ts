import { i18n } from '@/i18n';
import { hasSupabase } from '@/lib/supabase/client';

import { hasMapboxToken, routingProvider } from './mapboxConfig';
import { createMapboxPlaceSearch } from './mapboxPlaceSearch';
import { mapboxRouting } from './mapboxRouting';
import { mockPhotoUploader } from './mockPhotoUploader';
import { mockPlaceSearch } from './mockPlaceSearch';
import { mockRouting } from './mockRouting';
import { mockSubmitter } from './mockSubmitter';
import { supabasePhotoUploader } from './supabasePhotoUploader';
import { supabaseSubmitter } from './supabaseSubmitter';
import type {
  PlaceSearchService,
  RoutePhotoUploader,
  RouteSuggestionSubmitter,
  RoutingService,
} from './types';

export * from './types';
export { hasMapboxToken } from './mapboxConfig';

/** Real Mapbox search when a token is set in `.env`, otherwise the mock (docs/mapbox-routing.md). */
export const placeSearch: PlaceSearchService = hasMapboxToken
  ? createMapboxPlaceSearch(() => i18n.language)
  : mockPlaceSearch;

/** Mapbox Directions with a token; Valhalla is planned behind `EXPO_PUBLIC_ROUTING_PROVIDER=valhalla`. */
export const routing: RoutingService = hasMapboxToken && routingProvider === 'mapbox' ? mapboxRouting : mockRouting;

/** Self-hosted Supabase when configured; the mock (`EXPO_PUBLIC_MOCK_SUBMISSION`) otherwise. */
export const suggestionSubmitter: RouteSuggestionSubmitter = hasSupabase
  ? supabaseSubmitter
  : mockSubmitter;

/** Photos upload as soon as they are added (04.2); Supabase Storage when configured. */
export const photoUploader: RoutePhotoUploader = hasSupabase
  ? supabasePhotoUploader
  : mockPhotoUploader;

/** New Search Box session id (one per search sheet opening). */
export function createSearchSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
