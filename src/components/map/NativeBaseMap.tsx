import Mapbox from '@rnmapbox/maps';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { initMapbox, mapStyleUrl } from '@/lib/mapbox';

initMapbox();

export type MapboxModule = typeof Mapbox;
export type NativeMapViewProps = ComponentProps<typeof Mapbox.MapView>;

type NativeBaseMapProps = NativeMapViewProps & {
  /** Mapbox children (camera, sources, layers, markers), built with the lazily loaded module. */
  renderLayers?: (mapbox: MapboxModule) => ReactNode;
};

/**
 * The real Mapbox map. Only `BaseMap` imports this file, and only outside Expo Go, because
 * loading `@rnmapbox/maps` without its native code crashes the app.
 */
export function NativeBaseMap({ style, renderLayers, children, ...props }: NativeBaseMapProps) {
  return (
    <Mapbox.MapView
      styleURL={mapStyleUrl}
      compassEnabled={false}
      scaleBarEnabled={false}
      style={[styles.map, style]}
      {...props}>
      {renderLayers?.(Mapbox)}
      {children}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
