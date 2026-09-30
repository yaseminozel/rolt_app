import type { ReactNode } from 'react';

/**
 * Web preview stub: the app doesn't target web and `@rnmapbox/maps` needs `mapbox-gl` there,
 * so `BaseMap` always shows the design artwork on web and this module is never rendered.
 */
export type MapboxModule = never;
export type NativeMapViewProps = Record<string, unknown>;

export function NativeBaseMap(_props: NativeMapViewProps & { renderLayers?: (mapbox: MapboxModule) => ReactNode }) {
  return null;
}
