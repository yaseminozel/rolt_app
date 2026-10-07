import type { LngLat } from '@/features/routes/types';

/** Google encoded polyline with 6-digit precision (Mapbox `polyline6`), as `lat,lng` pairs. */
export function encodePolyline6(line: LngLat[]) {
  const factor = 1e6;
  let lastLat = 0;
  let lastLng = 0;
  let result = '';
  const encode = (value: number) => {
    let current = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (current >= 0x20) {
      chunk += String.fromCharCode((0x20 | (current & 0x1f)) + 63);
      current >>= 5;
    }
    return chunk + String.fromCharCode(current + 63);
  };
  for (const [lng, lat] of line) {
    const latE6 = Math.round(lat * factor);
    const lngE6 = Math.round(lng * factor);
    result += encode(latE6 - lastLat) + encode(lngE6 - lastLng);
    lastLat = latE6;
    lastLng = lngE6;
  }
  return result;
}
