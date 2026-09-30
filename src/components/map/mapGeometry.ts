import { boundsOf } from '@/features/routes/geo';
import type { LngLat, Route } from '@/features/routes/types';

/** Screen-space padding around a camera fit, in points. */
export type MapPadding = { top: number; right: number; bottom: number; left: number };

/** `Camera` `bounds` value (Mapbox wants `ne` / `sw` plus padding) fitting every coordinate. */
export function cameraBoundsFor(coordinates: LngLat[], padding: MapPadding) {
  const { northEast, southWest } = boundsOf(coordinates);
  return {
    ne: northEast,
    sw: southWest,
    paddingTop: padding.top,
    paddingRight: padding.right,
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
  };
}

/** The route line as a GeoJSON feature; `properties` feed data-driven layer styles. */
export function routeLineFeature(
  route: Route,
  properties: GeoJSON.GeoJsonProperties = {},
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    id: route.id,
    properties: { routeId: route.id, ...properties },
    geometry: { type: 'LineString', coordinates: route.coordinates },
  };
}

/** Start and finish points of a route (one point for loops). */
export function routeEndpointFeatures(
  route: Route,
  properties: GeoJSON.GeoJsonProperties = {},
): GeoJSON.Feature<GeoJSON.Point>[] {
  const first = route.coordinates[0];
  const last = route.coordinates[route.coordinates.length - 1];
  const points = route.isLoop || !last ? [first] : [first, last];
  return points.map((coordinates, index) => ({
    type: 'Feature',
    id: `${route.id}-${index === 0 ? 'start' : 'end'}`,
    properties: { routeId: route.id, ...properties },
    geometry: { type: 'Point', coordinates },
  }));
}

/** Coordinate halfway along the route's vertices, where its photo marker is anchored. */
export function routeMidpoint(route: Route): LngLat {
  return route.coordinates[Math.floor(route.coordinates.length / 2)];
}

const EARTH_CIRCUMFERENCE_M = 40075016.686;
/** Mapbox GL renders 512 pt tiles, so zoom 0 spans 512 points. */
const TILE_SIZE_PT = 512;

/** Ground distance covered by one screen point at `zoom` and `latitude`. */
export function metersPerPoint(zoom: number, latitude: number) {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (TILE_SIZE_PT * 2 ** zoom);
}

/**
 * Longest "round" distance (1, 2 or 5 × 10ⁿ metres) whose bar fits in `maxWidth` points,
 * so the scale reads e.g. 0 · 10 · 20 km like the design (`rxpI9`).
 */
export function scaleBarFor(metersPerPt: number, maxWidth: number) {
  const maxMeters = metersPerPt * maxWidth;
  const magnitude = 10 ** Math.floor(Math.log10(maxMeters));
  const step = [5, 2, 1].map((factor) => factor * magnitude).find((value) => value <= maxMeters) ?? magnitude;
  return { meters: step, width: step / metersPerPt };
}
