import type { ImageSourcePropType } from 'react-native';

import type { LngLat } from '@/features/routes/types';

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const hasToken = accessToken.startsWith('pk.') && accessToken.length > 10;
const DEFAULT_STYLE = 'mapbox/outdoors-v12';
/** Track colour on feed thumbnails: the brand blue of route lines. */
const LINE_COLOUR = '1515FF';
/** Static Images URLs must stay under 8 192 characters; keep the encoded path well below. */
const MAX_POINTS = 220;

const fallback: ImageSourcePropType = require('../../assets/images/maps/route-map-fallback.jpg');

function staticStyleId() {
  const url = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL;
  return url?.startsWith('mapbox://styles/') ? url.slice('mapbox://styles/'.length) : DEFAULT_STYLE;
}

/** Google encoded polyline (precision 5) of [lng, lat] points. */
function encodePolyline(points: LngLat[]) {
  let output = '';
  let previousLat = 0;
  let previousLng = 0;
  const encode = (value: number) => {
    let current = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (current >= 0x20) {
      chunk += String.fromCharCode((0x20 | (current & 0x1f)) + 63);
      current >>= 5;
    }
    return chunk + String.fromCharCode(current + 63);
  };
  for (const [lng, lat] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    output += encode(latE5 - previousLat) + encode(lngE5 - previousLng);
    previousLat = latE5;
    previousLng = lngE5;
  }
  return output;
}

function thin(points: LngLat[], max: number) {
  if (points.length <= max) {
    return points;
  }
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => points[Math.round(index * step)]);
}

/**
 * A static map picture of a ride or route line for feed cards (never a live map inside a list).
 * Uses the Mapbox Static Images API with the line as an overlay and an automatic viewport; without
 * a token, or without a line, the design's map artwork stands in.
 */
export function staticTrackImage(
  segments: readonly (readonly LngLat[])[] | null | undefined,
  { width = 600, height = 300 }: { width?: number; height?: number } = {},
): ImageSourcePropType {
  const lines = (segments ?? []).filter((segment) => segment.length >= 2);
  if (!hasToken || lines.length === 0) {
    return fallback;
  }
  const total = lines.reduce((sum, segment) => sum + segment.length, 0);
  const overlays = lines
    .map((segment) => thin([...segment], Math.max(2, Math.round((segment.length / total) * MAX_POINTS))))
    .map((points) => `path-4+${LINE_COLOUR}-0.95(${encodeURIComponent(encodePolyline(points))})`)
    .join(',');
  const size = `${Math.round(Math.min(width, 1280))}x${Math.round(Math.min(height, 1280))}@2x`;
  return {
    uri:
      `https://api.mapbox.com/styles/v1/${staticStyleId()}/static/${overlays}/auto/${size}` +
      `?padding=32&attribution=true&logo=true&access_token=${accessToken}`,
  };
}
