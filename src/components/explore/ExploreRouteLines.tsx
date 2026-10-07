import { useMemo } from 'react';

import { routeLineFeature } from '@/components/map/mapGeometry';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import type { Route } from '@/features/routes/types';
import { colors } from '@/theme';

/** 07.01 "Rota seçili": the selected route in brand blue over an 11 pt white casing. */
export const SELECTED_LINE = { width: 6, casing: 11 } as const;
/** The other routes: 3.5 pt grey over a 6 pt white casing at 90 %. */
export const OTHER_LINE = { width: 3.5, casing: 6, casingOpacity: 0.9 } as const;

type ExploreRouteLinesProps = {
  mapbox: MapboxModule;
  selected: Route;
  others: readonly Route[];
  onPressRoute: (routeId: string) => void;
};

/**
 * Route lines while a route is selected on "Haritada Keşfet" (the list state draws none).
 * Receives the Mapbox module so no screen imports `@rnmapbox/maps`.
 */
export function ExploreRouteLines({
  mapbox: Mapbox,
  selected,
  others,
  onPressRoute,
}: ExploreRouteLinesProps) {
  const otherShape = useMemo<GeoJSON.FeatureCollection>(
    () => ({ type: 'FeatureCollection', features: others.map((route) => routeLineFeature(route)) }),
    [others],
  );
  const selectedShape = useMemo(() => routeLineFeature(selected), [selected]);

  return (
    <>
      <Mapbox.ShapeSource
        id="explore-other-lines"
        shape={otherShape}
        hitbox={{ width: 24, height: 24 }}
        onPress={(event) => {
          const routeId = event.features[0]?.properties?.routeId;
          if (typeof routeId === 'string') {
            onPressRoute(routeId);
          }
        }}>
        <Mapbox.LineLayer
          id="explore-other-casing"
          style={{
            lineColor: colors.surface,
            lineWidth: OTHER_LINE.casing,
            lineOpacity: OTHER_LINE.casingOpacity,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Mapbox.LineLayer
          id="explore-other-line"
          style={{
            lineColor: colors.routeInactive,
            lineWidth: OTHER_LINE.width,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource id="explore-selected-line" shape={selectedShape}>
        <Mapbox.LineLayer
          id="explore-selected-casing"
          style={{
            lineColor: colors.surface,
            lineWidth: SELECTED_LINE.casing,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Mapbox.LineLayer
          id="explore-selected-line"
          style={{
            lineColor: colors.brand,
            lineWidth: SELECTED_LINE.width,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}
