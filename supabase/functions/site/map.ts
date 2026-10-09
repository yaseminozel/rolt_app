// Static map pictures of a route or ride line (Mapbox Static Images), proxied by the `site`
// function so pages and link previews get a stable roltapp.com URL that can be cached.

import type { LngLat } from './data.ts';

const accessToken = () => Deno.env.get('MAPBOX_ACCESS_TOKEN') ?? '';
const STYLE = 'mapbox/outdoors-v12';
/** Brand blue, as the app's route lines. */
const LINE_COLOUR = '1515FF';
/** Static Images URLs must stay under 8 192 characters; keep the encoded line well below. */
const MAX_POINTS = 220;

export const hasMapbox = () => accessToken().startsWith('pk.');

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

/** Mapbox Static Images URL of the lines, fitted with padding; null without a token or a line. */
export function staticMapUrl(segments: LngLat[][], width: number, height: number) {
  const lines = segments.filter((segment) => segment.length >= 2);
  if (!hasMapbox() || lines.length === 0) {
    return null;
  }
  const total = lines.reduce((sum, segment) => sum + segment.length, 0);
  const overlays = lines
    .map((segment) => thin(segment, Math.max(2, Math.round((segment.length / total) * MAX_POINTS))))
    .map((points) => `path-5+${LINE_COLOUR}-0.95(${encodeURIComponent(encodePolyline(points))})`)
    .join(',');
  return (
    `https://api.mapbox.com/styles/v1/${STYLE}/static/${overlays}/auto/${width}x${height}` +
    `?padding=48&attribution=true&logo=true&access_token=${accessToken()}`
  );
}
