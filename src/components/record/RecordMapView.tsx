import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import type { MapStyle } from '@/components/map/mapStyles';
import { RIDER_BOX, RiderMarker } from '@/components/navigation/NavigationMapView';
import type { LngLat } from '@/features/routes/types';
import { colors } from '@/theme';

const TRACK_WIDTH = 5;
const FOLLOW_ZOOM = 15.5;
/** The collapsed panel shows the map closer (`un0E9` dragged down). */
const DETAIL_ZOOM_STEP = 1;
const CAMERA_MS = 600;
/** Expo Go / web artwork: where the rider sits on the design's map (08.01 "Map/Heading Marker"). */
const FALLBACK_RIDER = { x: 0.63, y: 0.3 };

type RecordMapViewProps = {
  position: LngLat | null;
  headingDeg: number | null;
  /** Recorded track, one segment per uninterrupted stretch. */
  track: LngLat[][];
  /** Keep the camera on the rider; turns off when the rider pans the map. */
  follow: boolean;
  onUserGesture?: () => void;
  mapStyle?: MapStyle;
  weakSignal?: boolean;
  /** Closer zoom while the controls panel is collapsed. */
  detail?: boolean;
  /** Height covered by the controls panel: the rider is centred in the map above it. */
  bottomInset?: number;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Map of the Record tab (08.01–08.04): the heading marker on the rider and the recorded track in
 * the live-ride accent. Expo Go and the web show the design's map with the marker on it.
 */
export function RecordMapView({
  position,
  headingDeg,
  track,
  follow,
  onUserGesture,
  mapStyle,
  weakSignal,
  detail = false,
  bottomInset = 0,
  overlay,
  style,
}: RecordMapViewProps) {
  const shape = useMemo<GeoJSON.Feature<GeoJSON.MultiLineString>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiLineString',
        coordinates: track.filter((segment) => segment.length > 1),
      },
    }),
    [track],
  );

  if (!isNativeMapAvailable) {
    return (
      <View style={[styles.fill, style]}>
        <BaseMap fallbackImage={mapFallbacks.explore} style={StyleSheet.absoluteFill} />
        <View
          pointerEvents="none"
          style={[
            styles.fallbackRider,
            { left: `${FALLBACK_RIDER.x * 100}%`, top: `${FALLBACK_RIDER.y * 100}%` },
          ]}>
          <RiderMarker rotation={headingDeg ?? 0} weakSignal={weakSignal} />
        </View>
        {overlay}
      </View>
    );
  }

  return (
    <View style={[styles.fill, style]}>
      <BaseMap
        fallbackImage={mapFallbacks.explore}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        onCameraChanged={(state) => {
          if (state.gestures.isGestureActive) {
            onUserGesture?.();
          }
        }}
        renderLayers={(Mapbox) => (
          <>
            {follow && position ? (
              <Mapbox.Camera
                centerCoordinate={position}
                zoomLevel={FOLLOW_ZOOM + (detail ? DETAIL_ZOOM_STEP : 0)}
                padding={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: bottomInset }}
                animationDuration={CAMERA_MS}
                animationMode="easeTo"
              />
            ) : null}
            <Mapbox.ShapeSource id="record-track" shape={shape}>
              <Mapbox.LineLayer
                id="record-track-line"
                style={{
                  lineColor: colors.accentStrong,
                  lineWidth: TRACK_WIDTH,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
            {position ? (
              <Mapbox.MarkerView coordinate={position} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
                <RiderMarker rotation={headingDeg ?? 0} weakSignal={weakSignal} />
              </Mapbox.MarkerView>
            ) : null}
          </>
        )}
      />
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  fallbackRider: {
    position: 'absolute',
    marginLeft: -RIDER_BOX / 2,
    marginTop: -RIDER_BOX / 2,
  },
});
