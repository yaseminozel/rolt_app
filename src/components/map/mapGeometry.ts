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

/** Mapbox GL renders 512 pt tiles, so zoom 0 spans 512 points. */
const TILE_SIZE_PT = 512;

/** A position in screen points. */
export type ScreenPoint = { x: number; y: number };

/**
 * Web Mercator position in points at `zoom`: differences between two results are their
 * on-screen distance, which is all clustering needs (no camera or map view required).
 */
export function worldPoint([lng, lat]: LngLat, zoom: number): ScreenPoint {
  const size = TILE_SIZE_PT * 2 ** zoom;
  const sin = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

/** Markers that drew closer than the cluster distance, shown as one "N rota" badge. */
export type MarkerCluster<T> = {
  /** Stable while the membership stays the same (member ids joined). */
  key: string;
  members: T[];
  /** Mean of the members' marker coordinates. */
  coordinate: LngLat;
};

/**
 * Greedy screen-space clustering: each marker joins the first cluster whose centre lies within
 * `distance` points of it, otherwise it starts a new one. `project` maps a coordinate to screen
 * points (`worldPoint` at the camera zoom, or the fallback artwork's projection).
 */
export function clusterMarkers<T>(
  items: readonly T[],
  options: {
    id: (item: T) => string;
    coordinate: (item: T) => LngLat;
    project: (coordinate: LngLat) => ScreenPoint;
    distance: number;
  },
): MarkerCluster<T>[] {
  const groups: { members: T[]; coordinates: LngLat[]; x: number; y: number }[] = [];
  for (const item of items) {
    const coordinate = options.coordinate(item);
    const point = options.project(coordinate);
    const group = groups.find(
      (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < options.distance,
    );
    if (group) {
      const count = group.members.length;
      group.x = (group.x * count + point.x) / (count + 1);
      group.y = (group.y * count + point.y) / (count + 1);
      group.members.push(item);
      group.coordinates.push(coordinate);
    } else {
      groups.push({ members: [item], coordinates: [coordinate], x: point.x, y: point.y });
    }
  }
  return groups.map((group) => ({
    key: group.members.map(options.id).join('+'),
    members: group.members,
    coordinate: [
      group.coordinates.reduce((sum, [lng]) => sum + lng, 0) / group.coordinates.length,
      group.coordinates.reduce((sum, [, lat]) => sum + lat, 0) / group.coordinates.length,
    ],
  }));
}
