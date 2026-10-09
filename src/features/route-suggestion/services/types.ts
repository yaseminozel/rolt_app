import type { LngLat } from '@/features/routes/types';

import type { Place, RoutePreview, RouteSuggestionDraft, SubmissionProgress, SubmissionResult } from '../types';

/** Autocomplete row (04.1 "Başlangıç ara — Autocomplete"). */
export type PlaceSuggestion = {
  id: string;
  name: string;
  subtitle?: string;
  /** Category line such as "İlçe", when the provider returns one. */
  category?: string;
  /** Straight-line distance from the search origin, when known. */
  distanceKm?: number;
};

/**
 * Address search. Mapbox Search Box results are for temporary use only (docs/mapbox-routing.md):
 * keep them in memory; the backend re-geocodes permanently when a suggestion is stored.
 */
export interface PlaceSearchService {
  /** `sessionToken` groups one search into a single billable session (Search Box). */
  suggest(query: string, options: { sessionToken: string; proximity?: LngLat }): Promise<PlaceSuggestion[]>;
  retrieve(suggestion: PlaceSuggestion, options: { sessionToken: string }): Promise<Place>;
  reverse(coordinates: LngLat): Promise<Place>;
}

/**
 * No drivable road between the points (04.1 "Yol bulunamadı"). `waypointIndex` points at the
 * unreachable waypoint when known; `reason` picks the explanation; `alternative` is a reachable
 * place to offer instead ("Bostancı İskelesi'ni kullan") when the provider can suggest one.
 */
export class NoRouteError extends Error {
  constructor(
    public readonly waypointIndex: number | null,
    public readonly reason: 'noMotorVehicles' | 'unreachable',
    public readonly alternative: Place | null = null,
  ) {
    super('No drivable route');
    this.name = 'NoRouteError';
  }
}

/** Road route through the ordered coordinates (max 25). Throws `NoRouteError` when none exists. */
export interface RoutingService {
  route(coordinates: LngLat[]): Promise<RoutePreview>;
}

export class SubmissionError extends Error {
  constructor(
    /** Short code shown to the user, e.g. "RT-503". */
    public readonly code: string,
    public readonly reason: 'network' | 'server',
  ) {
    super(`Route suggestion failed: ${code}`);
    this.name = 'SubmissionError';
  }
}

/**
 * Uploads suggestion photos as soon as they are added (04.2), so sending (04.4) only has to
 * upload what is still missing.
 */
export interface RoutePhotoUploader {
  /** Resolves with the stored file's path. `isRetry` is set for "Tekrar" on a failed photo. */
  upload(
    uri: string,
    options: { isRetry: boolean; onProgress?: (fraction: number) => void },
  ): Promise<string>;
  /** Deletes an uploaded photo the rider removed again. */
  remove(storagePath: string): Promise<void>;
}

/** Sends a suggestion for review (04.4 → 04.5 / 04.6). */
export interface RouteSuggestionSubmitter {
  submit(draft: RouteSuggestionDraft, onProgress: (progress: SubmissionProgress) => void): Promise<SubmissionResult>;
}
