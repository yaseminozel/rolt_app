import Mapbox from '@rnmapbox/maps';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { initMapbox, mapStyleUrl } from '@/lib/mapbox';

initMapbox();

export type BaseMapProps = ComponentProps<typeof Mapbox.MapView>;

/**
 * Shared Mapbox map surface for Discover, Record and route detail screens.
 * The design draws its own map controls ("Konumuma git", "Yakınlaştırma", "Ölçek"),
 * so Mapbox's compass and scale bar are hidden. The Mapbox logo and attribution
 * stay visible as required by the Mapbox terms of service.
 */
export function BaseMap({ style, children, ...props }: BaseMapProps) {
  return (
    <Mapbox.MapView
      styleURL={mapStyleUrl}
      compassEnabled={false}
      scaleBarEnabled={false}
      style={[styles.map, style]}
      {...props}>
      {children}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
