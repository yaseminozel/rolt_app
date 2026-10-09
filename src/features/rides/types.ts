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
  /** Largest estimated lean to each side, degrees (`LeanEstimator`); missing on older rides. */
  maxLeanLeftDeg?: number;
  maxLeanRightDeg?: number;
};

/** A ride photo copied into the app; `failed` until "Tekrar dene" succeeds (08.07). */
export type RidePhoto = {
  id: string;
  /**
   * Shown on this device: the app's own copy (`ridePhotoFiles`), or the public URL of a
   * restored photo.
   */
  uri: string;
  status: 'uploading' | 'uploaded' | 'failed';
  /** 0–1 while uploading. */
  progress: number;
  /** Object path in the `ride-photos` bucket once uploaded (none in the mock). */
  path?: string;
  /**
   * Why the last upload of a `failed` photo failed: `connection` (offline, timeout, busy server)
   * may be saved anyway and goes up with the ride's sync; `rejected` keeps "Sürüşü kaydet" off.
   */
  failure?: 'connection' | 'rejected';
};

/** A sync failure retrying can't fix (e.g. the server refused the data); kept until the next edit. */
export type RideSyncError = { code?: string; message: string; at: number };

/**
 * A recorded ride (CLAUDE.md: Ride ≠ Route). Stored on the device first (P0); `synced` turns
 * true once the backend has it (row and photos) and false again after every edit. Title and
 * notes are user content.
 */
export type RideRecord = {
  id: string;
  status: RideStatus;
  /**
   * The account that saved it ("Sürüşü kaydet"). Recordings and drafts have none (a guest can
   * record), nor do rides saved before accounts existed (adopted by the next signed-in rider).
   */
  ownerId?: string;
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
  /** Last successful upload. Once set the ride exists on the server, so deleting it goes there too. */
  uploadedAt?: number;
  /** Uploaded photos removed in an edit; their files are deleted after the next upload. */
  removedPhotoPaths?: string[];
  /** Set when the server refused the ride; sync leaves it alone until the rider edits it. */
  syncError?: RideSyncError;
};

export const EMPTY_RIDE_STATS: RideStats = {
  distanceM: 0,
  durationS: 0,
  breakS: 0,
  breakCount: 0,
  maxSpeedMps: 0,
  curveCount: 0,
  maxLeanLeftDeg: 0,
  maxLeanRightDeg: 0,
};
