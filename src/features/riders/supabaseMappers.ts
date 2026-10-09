import {
  motorcycleBrandNames,
  type MotorcycleBrand,
} from '@/components/brand/MotorcycleBrandLogo';
import type { CommunityAuthor } from '@/features/community/types';
import { rideTitle } from '@/features/rides/rideTitle';
import type { RideType } from '@/features/rides/rideTypes';
import type { LngLat } from '@/features/routes/types';
import { staticTrackImage } from '@/lib/staticTrackImage';
import type { Json } from '@/lib/supabase/database.types';
import { imageSource } from '@/lib/supabase/storage';

import type { RideDetail, RideSummary } from './types';

/**
 * Mappers from the social read models (`author_json`, `ride_summary_json`, migrations 0003–0005)
 * to the app's types. The RPCs return camelCase JSON with storage paths; pictures become image
 * sources here.
 */

/** Map pictures on feed cards (240 × 100 next to photos, full width alone). */
export const CARD_MAP_SIZE = { width: 300, height: 100 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Profile and post ids are UUIDs; anything else (mock fixture ids) has no row to read. */
export const isUuid = (value: string | undefined | null): value is string =>
  Boolean(value && UUID.test(value));

export type JsonObject = { [key: string]: Json | undefined };

export const asObject = (value: Json | undefined): JsonObject | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;

export const str = (value: Json | undefined) => (typeof value === 'string' ? value : undefined);
export const num = (value: Json | undefined) => (typeof value === 'number' ? value : 0);
export const bool = (value: Json | undefined) => value === true;

export const isMotorcycleBrand = (value: string | undefined): value is MotorcycleBrand =>
  Boolean(value && value in motorcycleBrandNames);

/** `author_json.bike` is "<brand id> <model>"; shown with the brand's display name. */
export function bikeLine(value: Json | undefined) {
  const raw = str(value)?.trim();
  if (!raw) {
    return undefined;
  }
  const [brand, ...model] = raw.split(' ');
  return isMotorcycleBrand(brand) ? [motorcycleBrandNames[brand], ...model].join(' ') : raw;
}

export function mapAuthor(value: Json | undefined): CommunityAuthor {
  const json = asObject(value) ?? {};
  return {
    id: str(json.id) ?? '',
    name: str(json.name) ?? '',
    handle: str(json.handle) ?? '',
    avatar: imageSource('avatars', str(json.avatarPath), 'thumb'),
    bike: bikeLine(json.bike),
  };
}

/** A preview line from PostGIS (`MultiLineString` coordinates) as segments. */
export function mapPreview(value: Json | undefined): LngLat[][] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const segments = value
    .filter(Array.isArray)
    .map((segment) =>
      (segment as Json[]).filter(
        (point): point is [number, number] =>
          Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number',
      ),
    )
    .filter((segment) => segment.length >= 2)
    .map((segment) => segment.map(([lng, lat]) => [lng, lat] as LngLat));
  return segments.length > 0 ? segments : undefined;
}

export const photoSources = (value: Json | undefined, bucket: 'ride-photos' | 'post-photos') =>
  (Array.isArray(value) ? value : [])
    .map((path) => imageSource(bucket, str(path), 'card'))
    .filter((source) => source !== undefined);

/** Average speed over moving time (CLAUDE.md: distance / (duration − breaks)). */
export function averageSpeedKmh(distanceM: number, durationS: number, breakS: number) {
  const movingS = durationS - breakS > 0 ? durationS - breakS : durationS;
  return movingS > 0 ? distanceM / 1000 / (movingS / 3600) : 0;
}

/** One `ride_summary_json` row as a profile ride card. */
export function mapRideSummary(value: Json): RideSummary {
  const json = asObject(value) ?? {};
  const distanceM = num(json.distanceM);
  const durationS = num(json.durationS);
  const startedAt = str(json.startedAt) ?? new Date(0).toISOString();
  return {
    id: str(json.id) ?? '',
    riderId: str(json.riderId) ?? '',
    // An empty title is the automatic one, built in the reader's language (as on the device).
    title: rideTitle({
      title: str(json.title) ?? '',
      city: str(json.city),
      startedAt: Date.parse(startedAt),
    }),
    description: str(json.description),
    rideType: (str(json.rideType) ?? 'city') as RideType,
    startedAt,
    distanceKm: distanceM / 1000,
    durationMinutes: Math.round(durationS / 60),
    averageSpeedKmh: averageSpeedKmh(distanceM, durationS, num(json.breakS)),
    curveCount: num(json.curveCount),
    likeCount: num(json.likeCount),
    commentCount: num(json.commentCount),
    saveCount: num(json.saveCount),
    isLiked: bool(json.isLiked),
    isSaved: bool(json.isSaved),
    photos: photoSources(json.photoPaths, 'ride-photos'),
    mapImage: staticTrackImage(mapPreview(json.preview), CARD_MAP_SIZE),
  };
}

const DIFFICULTIES = ['easy', 'moderate', 'hard'] as const;
const SURFACES = ['asphalt', 'mixed', 'gravel'] as const;
const VISIBILITIES = ['public', 'followers', 'private'] as const;

const oneOf = <T extends string>(value: Json | undefined, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

const optionalNum = (value: Json | undefined) => (typeof value === 'number' ? value : undefined);

/** `get_ride` / `saved_rides` (`ride_summary_json` + author, difficulty, surface) → `RideDetail`. */
export function mapRideDetail(value: Json): RideDetail {
  const json = asObject(value) ?? {};
  return {
    ...mapRideSummary(value),
    author: mapAuthor(json.author),
    routeId: str(json.routeId),
    visibility: oneOf(json.visibility, VISIBILITIES, 'public'),
    endedAt: str(json.endedAt),
    durationS: num(json.durationS),
    maxSpeedKmh: num(json.maxSpeedMps) * 3.6,
    maxLeanLeftDeg: optionalNum(json.maxLeanLeftDeg),
    maxLeanRightDeg: optionalNum(json.maxLeanRightDeg),
    difficulty: oneOf(json.difficulty, DIFFICULTIES, 'moderate'),
    surface: oneOf(json.surface, SURFACES, 'asphalt'),
    preview: mapPreview(json.preview) ?? [],
  };
}
