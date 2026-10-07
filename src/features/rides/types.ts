import type { LngLat, RoadSurface, RouteDifficulty } from '@/features/routes/types';

import type { RideType } from './rideTypes';

/** "Kimler görebilir" (08.08): Herkes / Takipçilerim / Sadece ben. */
export type RideVisibility = 'public' | 'followers' | 'private';

export const RIDE_VISIBILITIES: readonly RideVisibility[] = ['public', 'followers', 'private'];

/**
 * Where a ride is in its life: `recording` while the recorder runs (and after a crash, for
 * 08.03 recovery), `draft` once finished and waiting for "Sürüşü kaydet" (08.05), `saved` after.
 */
export type RideStatus = 'recording' | 'draft' | 'saved';

/** Totals of a recording; times in seconds, distances in metres. */
export type RideStats = {
  distanceM: number;
  /** Recorded time: from start, minus user pauses and automatic (weak GPS) pauses. */
  durationS: number;
  /** Standing still ≥ `RECORDER_RULES.breakAfterS` while recording ("Mola"). */
  breakS: number;
  breakCount: number;
  maxSpeedMps: number;
  /** Bends of at least `RECORDER_RULES.curveMinTurnDeg` along the track ("Viraj"). */
  curveCount: number;
};

/** A ride photo copied into the app; `failed` until "Tekrar dene" succeeds (08.07). */
export type RidePhoto = {
  id: string;
  uri: string;
  status: 'uploading' | 'uploaded' | 'failed';
  /** 0–1 while uploading. */
  progress: number;
};

/**
 * A recorded ride (CLAUDE.md: Ride ≠ Route). Stored on the device first (P0); `synced` turns
 * true once the backend has it. Title and notes are user content.
 */
export type RideRecord = {
  id: string;
  status: RideStatus;
  rideType: RideType;
  /** Set when recorded while riding a route (Akış 09); "Rotayı tekrar sür" needs it. */
  routeId?: string;
  routeName?: string;
  /** Empty means the automatic title (`autoRideTitle`). */
  title: string;
  notes: string;
  difficulty: RouteDifficulty;
  surface: RoadSurface;
  visibility: RideVisibility;
  photos: RidePhoto[];
  /** Province where the ride started, for the automatic title ("Antalya · Pazartesi sürüşü"). */
  city?: string;
  startedAt: number;
  endedAt?: number;
  updatedAt: number;
  stats: RideStats;
  /** GPS track; a new segment starts after every pause so gaps aren't drawn as straight lines. */
  track: LngLat[][];
  synced: boolean;
};

export const EMPTY_RIDE_STATS: RideStats = {
  distanceM: 0,
  durationS: 0,
  breakS: 0,
  breakCount: 0,
  maxSpeedMps: 0,
  curveCount: 0,
};
