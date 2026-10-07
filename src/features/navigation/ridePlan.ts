import type { LngLat, Route } from '@/features/routes/types';

import { cumulativeDistances, distanceM, projectOnLine, sampleLine, sliceLine } from './geometry';
import type { PlanPoint, RideStop } from './types';

/** Mapbox Directions accepts at most 25 coordinates per request. */
const MAX_DIRECTIONS_POINTS = 25;
/** Further than this from the route start, the ride begins with an approach leg (06.01 "Buradan başlat"). */
export const APPROACH_THRESHOLD_M = 200;
/** "Rota üzerinde" below this offset, "Rota yakınında" below the next, else "Rotadan uzak" (06.02). */
export const ON_ROUTE_OFFSET_M = 120;
/** Places closer than this sit on the road itself and add no detour ("Rota üzerinde" badge). */
const NO_DETOUR_OFFSET_M = 20;
export const NEAR_ROUTE_OFFSET_M = 1_000;
/** Detours above this trigger the warning on the stop preview (note `wYzjk`). */
export const LARGE_DETOUR_M = 3_000;
/** Speed used to turn a detour into minutes on the suggestion list: 40 km/h. */
const DETOUR_SPEED_MPS = 11;
/** At most three stops (note `mUNKb`). */
export const MAX_RIDE_STOPS = 3;

/** The route line in riding direction (⇅ on 06.01 swaps start and finish). */
export function rideLine(route: Route, reversed: boolean): LngLat[] {
  return reversed ? [...route.coordinates].reverse() : route.coordinates;
}

export type StopPlacement = {
  /** Distance along the route line where the stop joins it. */
  alongM: number;
  /** Straight-line distance from the stop to the route. */
  offsetM: number;
  /** Rough extra riding: there and back from the line. */
  detourM: number;
  detourMinutes: number;
  proximity: 'onRoute' | 'nearRoute' | 'farFromRoute';
};

/** Where a place sits relative to the route, for "Rota üzerinde · 4,2. km" and "+1 dk". */
export function placeOnRoute(coordinates: LngLat, line: LngLat[]): StopPlacement {
  const cumulative = cumulativeDistances(line);
  const projection = projectOnLine(coordinates, line, cumulative);
  // Pulling off to a place beside the road still costs about a minute.
  const detourM = projection.offsetM < NO_DETOUR_OFFSET_M ? 0 : projection.offsetM * 2;
  return {
    alongM: projection.alongM,
    offsetM: projection.offsetM,
    detourM,
    detourMinutes: detourM === 0 ? 0 : Math.max(1, Math.round(detourM / DETOUR_SPEED_MPS / 60)),
    proximity:
      projection.offsetM < ON_ROUTE_OFFSET_M
        ? 'onRoute'
        : projection.offsetM < NEAR_ROUTE_OFFSET_M
          ? 'nearRoute'
          : 'farFromRoute',
  };
}

/** Stops in the order they come along the route line. */
export function sortStopsAlongRoute(stops: RideStop[], line: LngLat[]) {
  const cumulative = cumulativeDistances(line);
  return [...stops].sort(
    (a, b) => projectOnLine(a.coordinates, line, cumulative).alongM - projectOnLine(b.coordinates, line, cumulative).alongM,
  );
}

/** True when the rider's stop order makes them double back (note `wYzjk`). */
export function isStopOrderReversed(stops: RideStop[], line: LngLat[]) {
  const cumulative = cumulativeDistances(line);
  const positions = stops.map((stop) => projectOnLine(stop.coordinates, line, cumulative).alongM);
  return positions.some((position, index) => index > 0 && position < positions[index - 1]);
}

/**
 * Directions request for a ride: optional approach from the rider's position, then the route
 * line in pieces between the stops — in the rider's order, so a reordered stop makes the line
 * double back as it would on the road — with the stops as real waypoints. The line is sampled
 * so everything fits the 25-coordinate limit.
 */
export function buildRidePoints({
  line,
  stops,
  origin,
}: {
  line: LngLat[];
  stops: RideStop[];
  /** Rider position when the ride starts with an approach leg. */
  origin?: LngLat | null;
}): PlanPoint[] {
  const cumulative = cumulativeDistances(line);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const anchors = [0, ...stops.map((stop) => projectOnLine(stop.coordinates, line, cumulative).alongM), total];
  const budget = Math.max(stops.length + 2, MAX_DIRECTIONS_POINTS - (origin ? 1 : 0));
  const pieceLengths = anchors.slice(1).map((anchor, index) => Math.abs(anchor - anchors[index]));
  const pieceTotal = pieceLengths.reduce((sum, length) => sum + length, 0) || 1;
  // Every piece keeps its two ends; the remaining budget goes to the pieces by length.
  const spare = budget - (stops.length + 2);

  const points: PlanPoint[] = [{ coordinates: line[0], kind: 'waypoint' }];
  pieceLengths.forEach((length, index) => {
    const from = anchors[index];
    const to = anchors[index + 1];
    const piece = sliceLine(line, cumulative, Math.min(from, to), Math.max(from, to));
    const ordered = from <= to ? piece : [...piece].reverse();
    const inner = Math.floor((spare * length) / pieceTotal);
    const sampled = sampleLine(ordered, inner + 2).slice(1, -1);
    sampled.forEach((coordinates) => points.push({ coordinates, kind: 'via' }));
    const end = index < stops.length ? stops[index].coordinates : line[line.length - 1];
    points.push({ coordinates: end, kind: 'waypoint' });
  });

  if (origin) {
    // The route start becomes a silent via point: guidance flows straight into the route.
    points[0] = { ...points[0], kind: 'via' };
    points.unshift({ coordinates: origin, kind: 'waypoint' });
  }
  return points;
}

/** Distance from the rider to the route start, or `null` without a position. */
export function distanceToStart(position: LngLat | null, line: LngLat[]) {
  return position ? distanceM(position, line[0]) : null;
}

/**
 * Where a place joins the ride for the suggestion list: on the approach leg ("Başlangıca
 * giderken") when the ride starts away from the route and the place is closer to that leg,
 * otherwise its position on the route line.
 */
export function placeOnRide(coordinates: LngLat, line: LngLat[], approachLine: LngLat[] | null) {
  const placement = placeOnRoute(coordinates, line);
  if (approachLine && approachLine.length > 1) {
    const approach = placeOnRoute(coordinates, approachLine);
    if (approach.offsetM < placement.offsetM) {
      return { ...approach, onApproach: true as const };
    }
  }
  return { ...placement, onApproach: false as const };
}
