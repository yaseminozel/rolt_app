import { distanceKm } from '@/features/routes/geo';
import type { LngLat } from '@/features/routes/types';

import type { RoutePreview, Waypoint } from './types';

/** A waypoint whose place is set; the only kind the map editor works with. */
export type PlacedWaypoint = Waypoint & { place: NonNullable<Waypoint['place']> };

export const isPlaced = (waypoint: Waypoint): waypoint is PlacedWaypoint => waypoint.place !== null;

export const placedCoordinates = (waypoints: Waypoint[]): LngLat[] =>
  waypoints.filter(isPlaced).map((waypoint) => waypoint.place.coordinates);

/**
 * Maps `NoRouteError.waypointIndex` (an index into the routed coordinates, i.e. the waypoints
 * that have a place) back to the waypoint it refers to.
 */
export function waypointAtRoutedIndex(waypoints: Waypoint[], routedIndex: number | null): Waypoint | null {
  const placed = waypoints.filter(isPlaced);
  if (routedIndex === null) {
    return placed[placed.length - 1] ?? null;
  }
  return placed[routedIndex] ?? null;
}

/** Fallback riding speed for straight-line estimates when no road route is known yet. */
const DEFAULT_SPEED_KM_PER_MINUTE = 42 / 60;

/**
 * "Yola yapıştır" off: straight segments between the points. The duration keeps the pace of the
 * last road route (`paceMinutesPerKm`) so the numbers stay comparable while editing.
 */
export function straightPreview(coordinates: LngLat[], paceMinutesPerKm?: number): RoutePreview {
  const distance = coordinates.reduce(
    (total, point, index) => (index === 0 ? 0 : total + distanceKm(coordinates[index - 1], point)),
    0,
  );
  const pace = paceMinutesPerKm && Number.isFinite(paceMinutesPerKm) ? paceMinutesPerKm : 1 / DEFAULT_SPEED_KM_PER_MINUTE;
  return { distanceKm: distance, durationMinutes: distance * pace, geometry: coordinates };
}

/** Index of the geometry vertex closest to `point`, searching from `from` onwards. */
function nearestVertex(geometry: LngLat[], point: LngLat, from = 0) {
  let best = from;
  let bestDistance = Infinity;
  for (let index = from; index < geometry.length; index += 1) {
    const distance = distanceKm(geometry[index], point);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Vertex ranges of the route line between consecutive waypoints ("legs"). Falls back to the
 * straight segment when the geometry doesn't cover the points (e.g. an outdated preview).
 */
export function legPaths(coordinates: LngLat[], geometry: LngLat[] | null): LngLat[][] {
  if (coordinates.length < 2) {
    return [];
  }
  if (!geometry || geometry.length < 2) {
    return coordinates.slice(1).map((point, index) => [coordinates[index], point]);
  }
  const anchors: number[] = [];
  coordinates.forEach((point, index) => {
    anchors.push(nearestVertex(geometry, point, index === 0 ? 0 : anchors[index - 1]));
  });
  return coordinates.slice(1).map((point, index) => {
    const path = geometry.slice(anchors[index], anchors[index + 1] + 1);
    return path.length >= 2 ? path : [coordinates[index], point];
  });
}

/** Point halfway along a polyline (by length). */
export function pathMidpoint(path: LngLat[]): LngLat {
  const lengths = path.slice(1).map((point, index) => distanceKm(path[index], point));
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let travelled = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    if (travelled + lengths[index] >= half && lengths[index] > 0) {
      const t = (half - travelled) / lengths[index];
      const [a, b] = [path[index], path[index + 1]];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    travelled += lengths[index];
  }
  return path[0];
}

export const pathLengthKm = (path: LngLat[]) =>
  path.slice(1).reduce((sum, point, index) => sum + distanceKm(path[index], point), 0);

/** Leg (0-based) whose line passes closest to `point`: a new stop there goes to index `leg + 1`. */
export function nearestLeg(point: LngLat, legs: LngLat[][]) {
  let best = 0;
  let bestDistance = Infinity;
  legs.forEach((path, leg) => {
    path.slice(1).forEach((end, index) => {
      const distance = segmentDistance(point, path[index], end);
      if (distance < bestDistance) {
        best = leg;
        bestDistance = distance;
      }
    });
  });
  return best;
}

/** Planar distance from `point` to the segment `a`–`b`, longitude scaled by latitude (small areas). */
function segmentDistance(point: LngLat, a: LngLat, b: LngLat) {
  const scale = Math.cos((point[1] * Math.PI) / 180);
  const [px, py] = [point[0] * scale, point[1]];
  const [ax, ay] = [a[0] * scale, a[1]];
  const [bx, by] = [b[0] * scale, b[1]];
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
