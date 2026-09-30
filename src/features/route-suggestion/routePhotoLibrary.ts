import {
  Asset,
  AssetField,
  getPermissionsAsync,
  MediaType,
  Query,
  requestPermissionsAsync,
} from 'expo-media-library';

import type { LngLat } from '@/features/routes/types';

/*
 * Device photo library access for "Bu rotada çektiğin fotoğraflar". Web uses
 * `routePhotoLibrary.web.ts` (the media-library native module does not exist there).
 */

/**
 * Limits of the on-device scan for "Bu rotada çektiğin fotoğraflar" (04.2 `iJrop`).
 * Reading an asset's location is one native call per photo (EXIF / PHAsset), so the scan
 * looks at recent photos only and reads locations in small parallel batches.
 */
const LOOKBACK_DAYS = 60;
/** Newest photos inspected; ~200 location reads take well under a second on recent devices. */
const MAX_SCANNED_ASSETS = 200;
const LOCATION_BATCH_SIZE = 20;
/** A photo counts as "on the route" within this distance of the line. */
const MATCH_RADIUS_KM = 1;
/** The route line is thinned to at most this many vertices before matching. */
const MAX_LINE_POINTS = 300;
/** Newest matches shown in the strip. */
const MAX_SUGGESTIONS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const KM_PER_DEGREE_LAT = 111.32;

/** A library photo near the route. */
export type RoutePhotoSuggestion = {
  /** Media-library id: `ph://…` on iOS, `content://…` on Android. expo-image renders it directly. */
  id: string;
};

/**
 * File URI of a suggestion, for uploading. On iOS this may download the original from
 * iCloud, so it is resolved only for the photos the rider adds.
 */
export async function resolveSuggestionUri(suggestion: RoutePhotoSuggestion) {
  return new Asset(suggestion.id).getUri();
}

/**
 * Recent photos taken within ~1 km of the line, newest first. Asks for photo-library access
 * once (only while undetermined); returns `[]` without access.
 */
export async function findPhotosAlongLine(
  line: readonly LngLat[],
  isCancelled: () => boolean,
): Promise<RoutePhotoSuggestion[]> {
  if (line.length === 0) {
    return [];
  }
  if (!(await hasLibraryAccess())) {
    return [];
  }

  const since = Date.now() - LOOKBACK_DAYS * DAY_MS;
  const recent = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .gte(AssetField.CREATION_TIME, since)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .limit(MAX_SCANNED_ASSETS)
    .exeForMetadata();

  const matcher = createLineMatcher(line, MATCH_RADIUS_KM);
  const matches: RoutePhotoSuggestion[] = [];

  for (let start = 0; start < recent.length && matches.length < MAX_SUGGESTIONS; start += LOCATION_BATCH_SIZE) {
    // Stop reading locations once the sheet is closed.
    if (isCancelled()) {
      return [];
    }
    const batch = recent.slice(start, start + LOCATION_BATCH_SIZE);
    const locations = await Promise.all(
      batch.map((metadata) => new Asset(metadata.id).getLocation().catch(() => null)),
    );
    batch.forEach((metadata, index) => {
      const location = locations[index];
      if (location && matcher([location.longitude, location.latitude])) {
        matches.push({ id: metadata.id });
      }
    });
  }

  return matches.slice(0, MAX_SUGGESTIONS);
}

async function hasLibraryAccess() {
  const current = await getPermissionsAsync(false, ['photo']);
  if (current.granted) {
    return true;
  }
  if (current.status !== 'undetermined' || !current.canAskAgain) {
    return false;
  }
  const requested = await requestPermissionsAsync(false, ['photo']);
  return requested.granted;
}

/**
 * Point-near-polyline test on an equirectangular projection (accurate to a few metres at
 * 1 km). A padded bounding box rejects far photos before the segment loop.
 */
function createLineMatcher(line: readonly LngLat[], radiusKm: number) {
  const step = Math.max(1, Math.ceil(line.length / MAX_LINE_POINTS));
  const points = line.filter((_, index) => index % step === 0 || index === line.length - 1);
  const midLat = points.reduce((sum, [, lat]) => sum + lat, 0) / points.length;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos((midLat * Math.PI) / 180);
  const toKm = ([lng, lat]: LngLat): [number, number] => [lng * kmPerDegreeLng, lat * KM_PER_DEGREE_LAT];
  const projected = points.map(toKm);

  const padLat = radiusKm / KM_PER_DEGREE_LAT;
  const padLng = radiusKm / Math.max(kmPerDegreeLng, 1e-6);
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const minLng = Math.min(...lngs) - padLng;
  const maxLng = Math.max(...lngs) + padLng;
  const minLat = Math.min(...lats) - padLat;
  const maxLat = Math.max(...lats) + padLat;
  const radiusSquared = radiusKm * radiusKm;

  return (point: LngLat) => {
    const [lng, lat] = point;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
      return false;
    }
    const [px, py] = toKm(point);
    if (projected.length === 1) {
      const [x, y] = projected[0];
      return (px - x) ** 2 + (py - y) ** 2 <= radiusSquared;
    }
    for (let index = 1; index < projected.length; index += 1) {
      if (segmentDistanceSquared(px, py, projected[index - 1], projected[index]) <= radiusSquared) {
        return true;
      }
    }
    return false;
  };
}

function segmentDistanceSquared(px: number, py: number, [ax, ay]: [number, number], [bx, by]: [number, number]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
}
