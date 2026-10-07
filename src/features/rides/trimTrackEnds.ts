import { distanceM } from '@/features/navigation/geometry';
import type { LngLat } from '@/features/routes/types';

/** Point `metres` along the segment a → b. */
function interpolate(a: LngLat, b: LngLat, fraction: number): LngLat {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
}

/** Keeps only the part of `segment` between `fromM` and `toM` metres along it. */
function slice(segment: LngLat[], fromM: number, toM: number): LngLat[] {
  const out: LngLat[] = [];
  let along = 0;
  for (let index = 1; index < segment.length; index += 1) {
    const a = segment[index - 1];
    const b = segment[index];
    const length = distanceM(a, b);
    const start = along;
    const end = along + length;
    if (end > fromM && start < toM && length > 0) {
      const from = Math.max(fromM, start);
      const to = Math.min(toM, end);
      const first = interpolate(a, b, (from - start) / length);
      if (out.length === 0) {
        out.push(first);
      }
      out.push(interpolate(a, b, (to - start) / length));
    }
    along = end;
  }
  return out;
}

const segmentLength = (segment: LngLat[]) =>
  segment.reduce(
    (sum, point, index) => (index === 0 ? 0 : sum + distanceM(segment[index - 1], point)),
    0,
  );

/**
 * "Başlangıç ve bitişi gizle" (10.05): drops the first and last `metres` of a recorded track, so
 * maps don't reveal where a ride starts and ends. Distance and time stay as recorded.
 */
export function trimTrackEnds(track: LngLat[][], metres: number): LngLat[][] {
  const lengths = track.map(segmentLength);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total <= metres * 2) {
    return [];
  }
  const result: LngLat[][] = [];
  let offset = 0;
  track.forEach((segment, index) => {
    const from = Math.max(metres - offset, 0);
    const to = Math.min(total - metres - offset, lengths[index]);
    if (to > from) {
      const part = slice(segment, from, to);
      if (part.length > 1) {
        result.push(part);
      }
    }
    offset += lengths[index];
  });
  return result;
}
