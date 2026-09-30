import { useMemo } from 'react';

import type { Route } from '@/features/routes/types';
import { colors } from '@/theme';

import { routeEndpointFeatures, routeLineFeature } from './mapGeometry';
import type { MapboxModule } from './NativeBaseMap';

/** Line width of an unselected route (01.6 `Qwd6l` ≈ 4.35, 01.7 `TbPTH` 4). */
const LINE_WIDTH = 4;
/** Selected route on "Rota seçili" (01.7 `TXNES`). */
const SELECTED_LINE_WIDTH = 6;
/** Other routes while one is selected (01.7 `lBW4t`: 30 %). */
const DIMMED_OPACITY = 0.3;
/** Start / finish dots: 13 pt white dot with a 3 pt coloured ring. */
const ENDPOINT_RADIUS = 5;
const ENDPOINT_STROKE = 3;

type RouteLineLayersProps = {
  /** The lazily loaded `@rnmapbox/maps` module from `BaseMap`'s `renderLayers`. */
  mapbox: MapboxModule;
  /** Unique per map, used as the source / layer id prefix. */
  id: string;
  routes: readonly Route[];
  /** Keep it referentially stable (module-level or memoized) to avoid rebuilding the shapes. */
  colorFor: (route: Route) => string;
  /** Highlights this route and dims the others. */
  selectedRouteId?: string | null;
  onPressRoute?: (routeId: string) => void;
};

/**
 * Route lines with start and finish dots, drawn as Mapbox layers. Receives the Mapbox module
 * as a prop so no screen imports `@rnmapbox/maps` (it would crash Expo Go).
 */
export function RouteLineLayers({ mapbox: Mapbox, id, routes, colorFor, selectedRouteId, onPressRoute }: RouteLineLayersProps) {
  // Stable shapes, so unrelated re-renders don't resend the GeoJSON to the native sources.
  const lines = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((route) => routeLineFeature(route, { color: colorFor(route) })),
    }),
    [colorFor, routes],
  );
  const endpoints = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: routes.flatMap((route) => routeEndpointFeatures(route, { color: colorFor(route) })),
    }),
    [colorFor, routes],
  );
  const isSelected = ['==', ['get', 'routeId'], selectedRouteId ?? ''] as const;
  const opacity = selectedRouteId ? (['case', isSelected, 1, DIMMED_OPACITY] as const) : 1;
  const handlePress = onPressRoute
    ? (event: { features: GeoJSON.Feature[] }) => {
        const routeId = event.features[0]?.properties?.routeId;
        if (typeof routeId === 'string') {
          onPressRoute(routeId);
        }
      }
    : undefined;

  return (
    <>
      <Mapbox.ShapeSource id={`${id}-lines`} shape={lines} onPress={handlePress} hitbox={{ width: 24, height: 24 }}>
        <Mapbox.LineLayer
          id={`${id}-line`}
          style={{
            lineColor: ['get', 'color'],
            lineWidth: selectedRouteId ? (['case', isSelected, SELECTED_LINE_WIDTH, LINE_WIDTH] as const) : LINE_WIDTH,
            lineOpacity: opacity,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource id={`${id}-endpoints`} shape={endpoints}>
        <Mapbox.CircleLayer
          id={`${id}-endpoint`}
          style={{
            circleRadius: ENDPOINT_RADIUS,
            circleColor: colors.surface,
            circleStrokeColor: ['get', 'color'],
            circleStrokeWidth: ENDPOINT_STROKE,
            circleOpacity: opacity,
            circleStrokeOpacity: opacity,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}
