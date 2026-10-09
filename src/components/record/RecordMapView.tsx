import { useEffect, useMemo, useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import type { MapStyle } from '@/components/map/mapStyles';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { RIDER_BOX, RiderMarker } from '@/components/navigation/NavigationMapView';
import type { TrackViewState } from '@/features/rides/trackView';
import type { LngLat } from '@/features/routes/types';
import { colors } from '@/theme';

const TRACK_WIDTH = 5;
const TRACK_STYLE = {
  lineColor: colors.accentStrong,
  lineWidth: TRACK_WIDTH,
  lineCap: 'round',
  lineJoin: 'round',
} as const;
const FOLLOW_ZOOM = 15.5;
/** The collapsed panel shows the map closer (`un0E9` dragged down). */
const DETAIL_ZOOM_STEP = 1;
const CAMERA_MS = 600;
/** "Konumum" flies back to the rider quickly, north up. */
const RECENTER_MS = 450;
/**
 * Camera events right after "Konumum" still carry the fling the rider just made; they must not
 * switch following off again.
 */
const RECENTER_GESTURE_GUARD_MS = 700;

type CameraRef = ComponentRef<MapboxModule['Camera']>;

/** "Konumum" request: a new `key` moves the camera to `to` at once. */
export type RecenterRequest = { key: number; to: LngLat };
/** Expo Go / web artwork: where the rider sits on the design's map (08.01 "Map/Heading Marker"). */
const FALLBACK_RIDER = { x: 0.63, y: 0.3 };

type RecordMapViewProps = {
  position: LngLat | null;
  headingDeg: number | null;
  /**
   * Recorded track as `TrackView` gives it: the committed part (rebuilt only on a new commit) and
   * the live tail, so a long ride doesn't send its whole line to the map on every fix.
   */
  track: TrackViewState;
  /** Keep the camera on the rider; turns off when the rider pans the map. */
  follow: boolean;
  onUserGesture?: () => void;
  recenter?: RecenterRequest | null;
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
  recenter,
  mapStyle,
  weakSignal,
  detail = false,
  bottomInset = 0,
  overlay,
  style,
}: RecordMapViewProps) {
  const { committed, commits, tail } = track;
  const committedShape = useMemo<GeoJSON.Feature<GeoJSON.MultiLineString>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiLineString',
        coordinates: committed.filter((segment) => segment.length > 1),
      },
    }),
    // `commits` changes exactly when `committed` does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commits],
  );
  const tailShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: 'FeatureCollection',
      // Under two points there is no line yet (an empty LineString isn't valid GeoJSON).
      features:
        tail.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: tail } }]
          : [],
    }),
    [tail],
  );

  const cameraRef = useRef<CameraRef>(null);
  const ignoreGesturesUntil = useRef(0);
  const zoomLevel = FOLLOW_ZOOM + (detail ? DETAIL_ZOOM_STEP : 0);
  const padding = useMemo(
    () => ({ paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: bottomInset }),
    [bottomInset],
  );

  // Following: the camera is driven imperatively (a camera mounted only while following did not
  // always move when it came back, so "Konumum" could leave the map where it was).
  useEffect(() => {
    if (!follow || !position) {
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: position,
      zoomLevel,
      padding,
      animationDuration: CAMERA_MS,
      animationMode: 'easeTo',
    });
  }, [follow, position, zoomLevel, padding]);

  // "Konumum": straight to the rider's current position, north up and flat.
  useEffect(() => {
    if (!recenter) {
      return;
    }
    ignoreGesturesUntil.current = Date.now() + RECENTER_GESTURE_GUARD_MS;
    cameraRef.current?.setCamera({
      centerCoordinate: recenter.to,
      zoomLevel,
      heading: 0,
      pitch: 0,
      padding,
      animationDuration: RECENTER_MS,
      animationMode: 'easeTo',
    });
    // Only a new request moves the camera; zoom and padding changes are followed above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter]);

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
          if (state.gestures.isGestureActive && Date.now() >= ignoreGesturesUntil.current) {
            onUserGesture?.();
          }
        }}
        renderLayers={(Mapbox) => (
          <>
            <Mapbox.Camera
              ref={cameraRef}
              defaultSettings={
                position ? { centerCoordinate: position, zoomLevel, padding } : undefined
              }
            />
            <Mapbox.ShapeSource id="record-track" shape={committedShape}>
              <Mapbox.LineLayer id="record-track-line" style={TRACK_STYLE} />
            </Mapbox.ShapeSource>
            <Mapbox.ShapeSource id="record-track-tail" shape={tailShape}>
              <Mapbox.LineLayer id="record-track-tail-line" style={TRACK_STYLE} />
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
