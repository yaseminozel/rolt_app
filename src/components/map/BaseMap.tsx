import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MapboxModule, NativeMapViewProps } from './NativeBaseMap';

/**
 * Mapbox needs native code that Expo Go doesn't ship, so there the design's own map
 * artwork is shown instead; development and production builds render the real map.
 */
export const isNativeMapAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export type BaseMapProps = Omit<NativeMapViewProps, 'children'> & {
  /** Map artwork from the design, shown in Expo Go (e.g. `assets/images/maps/*-fallback.jpg`). */
  fallbackImage: ImageSource | number;
  /** Extra overlay drawn on the fallback image only (native maps draw through `renderLayers`). */
  fallbackOverlay?: ReactNode;
  /**
   * Mapbox children built from the lazily loaded module, e.g.
   * `renderLayers={(Mapbox) => <Mapbox.Camera … />}`. Never import `@rnmapbox/maps`
   * directly in screens — it crashes Expo Go.
   */
  renderLayers?: (mapbox: MapboxModule) => ReactNode;
};

/**
 * Shared map surface for Discover, route detail and Record. The design draws its own map
 * controls ("Konumuma git", "Yakınlaştırma", "Ölçek"), so Mapbox's compass and scale bar are
 * hidden; the Mapbox logo and attribution stay visible as the Mapbox terms require.
 */
export function BaseMap({ fallbackImage, fallbackOverlay, style, ...props }: BaseMapProps) {
  if (!isNativeMapAvailable) {
    return (
      <View style={[styles.map, style]}>
        <Image source={fallbackImage} contentFit="cover" style={StyleSheet.absoluteFill} />
        {fallbackOverlay}
      </View>
    );
  }

  // Lazy so Expo Go never evaluates `@rnmapbox/maps`.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NativeBaseMap } = require('./NativeBaseMap') as typeof import('./NativeBaseMap');
  return <NativeBaseMap style={style} {...props} />;
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    overflow: 'hidden',
  },
});

/** Design map artwork used as the Expo Go fallback for each map surface. */
export const mapFallbacks = {
  /** Discover Home "Harita kartı / Bölgedeki rotalar" (oxSGl) without its pill and button. */
  homeCard: require('../../../assets/images/maps/home-map-fallback.jpg'),
  /** Route detail "Harita kartı" (WZKFi) with the route trace. */
  routeDetail: require('../../../assets/images/maps/route-map-fallback.jpg'),
  /** "Haritada Keşfet" full map (u7KNSz) with routes and photo markers. */
  explore: require('../../../assets/images/maps/explore-map-fallback.jpg'),
};
