import type { LngLat, RouteDifficulty, RouteTag } from '@/features/routes/types';

/** A place picked for a waypoint (from search, "Mevcut konumum" or "Haritadan seç"). */
export type Place = {
  /** Provider id (Mapbox `mapbox_id`) or a local id for current-location / map picks. */
  id: string;
  /** Primary line, e.g. "Kadıköy İskelesi". */
  name: string;
  /** Secondary line, e.g. "Rıhtım Cd., Kadıköy". */
  subtitle?: string;
  coordinates: LngLat;
};

export type WaypointKind = 'start' | 'stop' | 'end';

/** One row of the stop list (04.1): A (start), any number of stops, B (end). */
export type Waypoint = {
  id: string;
  kind: WaypointKind;
  place: Place | null;
};

/** Directions result shown as "73 km · ~1 sa 45 dk" and drawn as the preview line. */
export type RoutePreview = {
  distanceKm: number;
  durationMinutes: number;
  /** Total climb in metres when the provider reports it ("Tırmanış"). */
  elevationGainM?: number;
  geometry: LngLat[];
};

/** Photos upload as soon as they are added (04.2 "Eksik bilgi ve yükleme"). */
export type PhotoUploadStatus = 'uploading' | 'uploaded' | 'failed';

export type RoutePhoto = {
  id: string;
  uri: string;
  uploadStatus: PhotoUploadStatus;
  /** Where the uploaded file is stored (`suggestion-photos/<user id>/…`); set once uploaded. */
  storagePath?: string;
};

/** Everything the user enters across 04.1–04.3; persisted as the draft if sending fails. */
export type RouteSuggestionDraft = {
  waypoints: Waypoint[];
  preview: RoutePreview | null;
  name: string;
  /** "Rota türü", at most `MAX_SUGGESTION_TAGS`. */
  tags: RouteTag[];
  difficulty: RouteDifficulty | null;
  description: string;
  /** First photo is the cover ("Kapak"). */
  photos: RoutePhoto[];
};

export const MAX_SUGGESTION_TAGS = 3;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_SUGGESTION_PHOTOS = 10;
/** Directions accepts 25 coordinates: start + 23 stops + end. */
export const MAX_STOPS = 23;

/** Steps of the sending checklist (04.4). */
export type SubmissionStep = 'validateLine' | 'uploadDetails' | 'uploadPhotos' | 'sendToReview';

export type SubmissionProgress = {
  /** 0–1 overall progress ("%68"). */
  fraction: number;
  /** Step currently running; earlier steps are done. */
  step: SubmissionStep;
  uploadedPhotos: number;
  totalPhotos: number;
};

export type SubmissionResult = {
  /** Tracking number shown on success, e.g. "RLT-48271". */
  trackingId: string;
  submittedAt: string;
};
