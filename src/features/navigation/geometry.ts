import type { LngLat } from '@/features/routes/types';

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north (0–360). */
export function bearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lng2 - lng1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Signed smallest turn from `from` to `to` in degrees (-180…180, positive = right). */
export function turnAngle(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

/** Running distance at each vertex of a line. */
export function cumulativeDistances(line: LngLat[]) {
  const result = [0];
  for (let index = 1; index < line.length; index += 1) {
    result.push(result[index - 1] + distanceM(line[index - 1], line[index]));
  }
  return result;
}

/** Point `t` (0–1) of the way from `a` to `b` (linear in degrees; fine for short segments). */
export function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export type LineProjection = {
  /** Closest point on the line. */
  point: LngLat;
  /** Distance along the line to that point. */
  alongM: number;
  /** Distance from the input to the line. */
  offsetM: number;
  /** Index of the segment start vertex. */
  segmentIndex: number;
};

/**
 * Closest point of `line` to `point`, using a local planar approximation per segment (accurate
 * to well under a metre at road scale). `minAlongM` skips segments that end before it, so a
 * rider on a route that doubles back is matched to the part ahead, not one already ridden.
 */
export function projectOnLine(
  point: LngLat,
  line: LngLat[],
  cumulative: number[],
  minAlongM = 0,
  maxAlongM = Infinity,
): LineProjection {
  let best: LineProjection = { point: line[0], alongM: 0, offsetM: Infinity, segmentIndex: 0 };
  const cosLat = Math.cos(toRadians(point[1]));
  for (let index = 0; index < line.length - 1; index += 1) {
    if (cumulative[index + 1] < minAlongM) {
      continue;
    }
    if (cumulative[index] > maxAlongM) {
      break;
    }
    const a = line[index];
    const b = line[index + 1];
    const ax = (a[0] - point[0]) * cosLat;
    const ay = a[1] - point[1];
    const bx = (b[0] - point[0]) * cosLat;
    const by = b[1] - point[1];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
    const projected = interpolate(a, b, t);
    const offset = distanceM(point, projected);
    if (offset < best.offsetM) {
      const segmentLength = cumulative[index + 1] - cumulative[index];
      best = {
        point: projected,
        alongM: cumulative[index] + segmentLength * t,
        offsetM: offset,
        segmentIndex: index,
      };
    }
  }
  return best;
}

/** The point `alongM` metres along the line, and the bearing of the line there. */
export function pointAlong(line: LngLat[], cumulative: number[], alongM: number) {
  const total = cumulative[cumulative.length - 1] ?? 0;
  const target = Math.max(0, Math.min(alongM, total));
  let index = 0;
  while (index < cumulative.length - 2 && cumulative[index + 1] < target) {
    index += 1;
  }
  const a = line[index];
  const b = line[Math.min(index + 1, line.length - 1)];
  const segmentLength = cumulative[index + 1] - cumulative[index] || 1;
  const t = (target - cumulative[index]) / segmentLength;
  return { point: interpolate(a, b, Math.max(0, Math.min(1, t))), bearing: bearingDeg(a, b), index };
}

/** The part of the line from `fromM` to `toM` along it. */
export function sliceLine(line: LngLat[], cumulative: number[], fromM: number, toM = Infinity) {
  const total = cumulative[cumulative.length - 1] ?? 0;
  const start = pointAlong(line, cumulative, fromM);
  const end = pointAlong(line, cumulative, Math.min(toM, total));
  const middle = line.filter((_, index) => cumulative[index] > fromM && cumulative[index] < Math.min(toM, total));
  return [start.point, ...middle, end.point];
}

/**
 * At most `maxPoints` vertices of a line, evenly spread by distance, always keeping the first
 * and last — Mapbox Directions takes up to 25 coordinates per request.
 */
export function sampleLine(line: LngLat[], maxPoints: number) {
  if (line.length <= maxPoints) {
    return line;
  }
  const cumulative = cumulativeDistances(line);
  const total = cumulative[cumulative.length - 1];
  return Array.from({ length: maxPoints }, (_, index) =>
    index === maxPoints - 1 ? line[line.length - 1] : pointAlong(line, cumulative, (total * index) / (maxPoints - 1)).point,
  );
}
