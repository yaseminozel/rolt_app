import Mapbox from '@rnmapbox/maps';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { initMapbox, mapStyleUrl } from '@/lib/mapbox';

import type { MapStyle } from './mapStyles';

initMapbox();

export type MapboxModule = typeof Mapbox;
export type NativeMapViewProps = ComponentProps<typeof Mapbox.MapView>;

type NativeBaseMapProps = NativeMapViewProps & {
  /** Mapbox children (camera, sources, layers, markers), built with the lazily loaded module. */
  renderLayers?: (mapbox: MapboxModule) => ReactNode;
  /** Base map look; `styleURL` still wins when both are given. */
  mapStyle?: MapStyle;
};

const styleUrls: Record<MapStyle, string> = {
  default: mapStyleUrl,
  satellite: Mapbox.StyleURL.SatelliteStreet,
};

/**
 * The real Mapbox map. Only `BaseMap` imports this file, and only outside Expo Go, because
 * loading `@rnmapbox/maps` without its native code crashes the app.
 */
export function NativeBaseMap({ style, renderLayers, mapStyle = 'default', children, ...props }: NativeBaseMapProps) {
  return (
    <Mapbox.MapView
      styleURL={styleUrls[mapStyle]}
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
