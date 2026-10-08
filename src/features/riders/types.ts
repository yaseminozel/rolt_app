import type { ImageSourcePropType } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import type { MotorcycleCategory } from '@/features/garage/types';
import type { RoadPreference } from '@/features/registration/types';
import type { RideType } from '@/features/rides/rideTypes';

/** A motorcycle in a rider's garage ("Garaj" tab, header bike line). */
export type RiderBike = {
  id: string;
  brand: MotorcycleBrand;
  /** Model name without the brand, e.g. "MT-07". */
  model: string;
  year?: number;
  displacementCc?: number;
  /** Label via `garage:categories.*`. */
  category?: MotorcycleCategory;
  /** The main bike, shown under the rider's bio. */
  isPrimary: boolean;
};

/**
 * Public rider profile (01.8 other rider, 03.0 own profile). Bio and city are user content,
 * shown as-is. `isFollowing` is relative to the signed-in viewer.
 */
export type Rider = {
  id: string;
  name: string;
  /** Username without "@", e.g. "denizrides". */
  handle: string;
  avatar?: ImageSourcePropType;
  bio?: string;
  /** Free-form location line, e.g. "İstanbul, Türkiye". */
  city?: string;
  bikes: RiderBike[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

/**
 * A recorded ride as shown in a profile's "Sürüşler" feed (CLAUDE.md: Route ≠ Ride).
 * Title is user content.
 */
export type RideSummary = {
  id: string;
  riderId: string;
  title: string;
  rideType: RideType;
  /** ISO date-time with offset, e.g. "2026-09-12T19:30:00+03:00". */
  startedAt: string;
  distanceKm: number;
  durationMinutes: number;
  averageSpeedKmh: number;
  /** "Viraj" on community-style cards (13.03); older fixtures omit it. */
  curveCount?: number;
  likeCount: number;
  commentCount: number;
  /** Bookmark count ("Aksiyon / Kaydet" in the design). */
  saveCount: number;
  isLiked: boolean;
  isSaved: boolean;
  photos: ImageSourcePropType[];
  /** Static map thumbnail with the ride trace (never a live map inside the feed). */
  mapImage: ImageSourcePropType;
};

/** "Ortak noktalar" note on another rider's profile: how well the viewer and the rider match. */
export type RiderMatch = {
  /** Match percentage 0–100. */
  score: number;
  sharedRouteCount: number;
  /** Road preference both riders picked; copy via `profile:match.sharedPreference.*`. */
  reason: RoadPreference;
};

/** Content a viewer can report from a profile: the rider, or one of their rides. */
export type ReportTarget = { type: 'rider'; riderId: string } | { type: 'ride'; rideId: string };

/**
 * Data access for rider profiles. Screens use the hooks in `queries.ts`; the mock is replaced
 * by self-hosted Supabase later.
 */
export interface RidersRepository {
  getById(id: string): Promise<Rider | null>;
  listRides(riderId: string): Promise<RideSummary[]>;
  /** Match between the signed-in viewer and `riderId`; `null` for guests or without overlap. */
  getMatch(riderId: string): Promise<RiderMatch | null>;
  setFollowing(riderId: string, following: boolean): Promise<void>;
  setRideLiked(rideId: string, liked: boolean): Promise<void>;
  setRideSaved(rideId: string, saved: boolean): Promise<void>;
  report(target: ReportTarget): Promise<void>;
  block(riderId: string): Promise<void>;
  /** "Engellenen kullanıcılar" (10.06), most recently blocked first. */
  listBlocked(): Promise<BlockedRider[]>;
  unblock(riderId: string): Promise<void>;
}

/** A rider the viewer blocked (10.06): just enough to recognise them. Name is user content. */
export type BlockedRider = {
  id: string;
  name: string;
  /** Username without "@". */
  handle: string;
  avatar?: ImageSourcePropType;
};
