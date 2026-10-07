import { Image as ExpoImage } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { cameraBoundsFor } from '@/components/map/mapGeometry';
import { createProjection, polylinePath } from '@/components/route-builder/routeProjection';
import type { LngLat } from '@/features/routes/types';
import { colors } from '@/theme';

import { StopNumber } from './StopNumber';

const headingMarker = require('../../../assets/images/ride/heading-marker.png');
const stopReached = require('../../../assets/images/ride/stop-reached.png');
const finishFlag = require('../../../assets/images/ride/finish-flag.png');
const selectedPin = require('../../../assets/images/ride/pin-selected.png');

/** "Pin / Seçili durak" (06.03): exported with its shadow, tip at the bottom centre. */
const PIN_SIZE = { width: 66, height: 80 };

/** "Map/Heading Marker" (06.06 `TZ73p`): 99 × 100 cone with the position dot near the bottom. */
const HEADING_SIZE = { width: 99, height: 100 };
/** Position dot centre inside the marker image (measured on the exported artwork). */
const HEADING_ANCHOR = { x: 0.667, y: 0.798 };
/** The drawn cone points 29° west of north; rotations add this back so 0° faces north. */
const IMAGE_BEARING = -29;
/** Accuracy ring while GPS is weak (06.06 `CUBTG` "Konum doğruluğu"). */
const ACCURACY_RING = 120;
/** Square that contains the marker however it is rotated, with the dot at its centre. */
export const RIDER_BOX =
  2 * Math.ceil(Math.hypot(HEADING_SIZE.width * HEADING_ANCHOR.x, HEADING_SIZE.height * HEADING_ANCHOR.y));
const LINE_WIDTH = 6;
const FOLLOW_ZOOM = 16.5;
const FOLLOW_PITCH = 45;

export type NavigationCamera =
  | { mode: 'overview'; padding: { top: number; right: number; bottom: number; left: number } }
  | { mode: 'follow' }
  | { mode: 'point'; center: LngLat; zoom?: number };

export type NavigationMapViewProps = {
  line: LngLat[];
  stops?: { id: string; coordinates: LngLat; reached?: boolean }[];
  finish?: LngLat | null;
  rider?: { position: LngLat; headingDeg: number; weakSignal?: boolean } | null;
  /** A place being previewed as a stop (06.03 "Pin / Seçili durak"). */
  pin?: LngLat | null;
  camera: NavigationCamera;
  /** Native maps: the map centre after the rider pans (06.02 "Haritadan seç"). */
  onCenterChange?: (center: LngLat) => void;
  /** Native maps: the rider moved the map by hand (navigation stops following). */
  onUserGesture?: () => void;
  /** Extra overlay above the map (both native and fallback), e.g. a fixed centre pin. */
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Map of the ride screens (06.01–06.07): the route line in brand blue, numbered stops (a green
 * check pin once reached), the finish flag and the heading marker. Native maps follow the rider
 * course-up in navigation; Expo Go and the web draw the same elements over the design's map
 * artwork, fitted to the route.
 */
export function NavigationMapView({
  line,
  stops = [],
  finish,
  rider,
  pin,
  camera,
  onCenterChange,
  onUserGesture,
  overlay,
  style,
}: NavigationMapViewProps) {
  if (!isNativeMapAvailable) {
    return (
      <FallbackMap line={line} stops={stops} finish={finish} rider={rider} pin={pin} overlay={overlay} style={style} />
    );
  }
  return (
    <View style={[styles.fill, style]}>
      <BaseMap
        fallbackImage={mapFallbacks.homeCard}
        style={StyleSheet.absoluteFill}
        onCameraChanged={(state) => {
          if (state.gestures.isGestureActive) {
            onUserGesture?.();
          }
        }}
        onMapIdle={(state) => {
          const center = state.properties.center as LngLat;
          onCenterChange?.(center);
        }}
        renderLayers={(Mapbox) => (
          <>
            {camera.mode === 'overview' ? (
              <Mapbox.Camera bounds={cameraBoundsFor(line, camera.padding)} animationDuration={600} />
            ) : camera.mode === 'point' ? (
              <Mapbox.Camera centerCoordinate={camera.center} zoomLevel={camera.zoom ?? 15} animationDuration={600} />
            ) : rider ? (
              <Mapbox.Camera
                centerCoordinate={rider.position}
                heading={rider.headingDeg}
                pitch={FOLLOW_PITCH}
                zoomLevel={FOLLOW_ZOOM}
                animationDuration={900}
                animationMode="easeTo"
              />
            ) : null}
            <Mapbox.ShapeSource
              id="ride-line"
              shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }}>
              <Mapbox.LineLayer
                id="ride-line-layer"
                style={{ lineColor: colors.brand, lineWidth: LINE_WIDTH, lineCap: 'round', lineJoin: 'round' }}
              />
            </Mapbox.ShapeSource>
            {stops.map((stop, index) => (
              <Mapbox.MarkerView key={stop.id} coordinate={stop.coordinates} anchor={{ x: 0.5, y: stop.reached ? 1 : 0.5 }}>
                {stop.reached ? <Image source={stopReached} style={styles.stopReached} /> : <StopNumber number={index + 1} />}
              </Mapbox.MarkerView>
            ))}
            {finish ? (
              <Mapbox.MarkerView coordinate={finish} anchor={{ x: 0.5, y: 0.5 }}>
                <Image source={finishFlag} style={styles.flag} />
              </Mapbox.MarkerView>
            ) : null}
            {pin ? (
              <Mapbox.MarkerView coordinate={pin} anchor={{ x: 0.5, y: 0.92 }} allowOverlap>
                <Image source={selectedPin} style={styles.pin} />
              </Mapbox.MarkerView>
            ) : null}
            {rider ? (
              <Mapbox.MarkerView coordinate={rider.position} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
                <RiderMarker
                  rotation={camera.mode === 'follow' ? 0 : rider.headingDeg}
                  weakSignal={rider.weakSignal}
                />
              </Mapbox.MarkerView>
            ) : null}
          </>
        )}
      />
      {overlay}
    </View>
  );
}

/**
 * Heading marker in a square box centred on the position dot, so rotating the box turns the cone
 * around the dot (rotating the image itself would swing the dot off the rider's position).
 */
export function RiderMarker({ rotation, weakSignal }: { rotation: number; weakSignal?: boolean }) {
  return (
    <View style={styles.riderBox} pointerEvents="none">
      {weakSignal ? <View style={styles.accuracyRing} /> : null}
      <View style={[styles.riderBox, styles.riderRotor, { transform: [{ rotate: `${rotation - IMAGE_BEARING}deg` }] }]}>
        <Image source={headingMarker} style={[styles.heading, styles.headingInBox, weakSignal && styles.dimmed]} />
      </View>
    </View>
  );
}

type FallbackMapProps = Pick<NavigationMapViewProps, 'line' | 'stops' | 'finish' | 'rider' | 'pin' | 'overlay' | 'style'>;

/** Expo Go / web: the map artwork with the route and markers projected onto it. */
function FallbackMap({ line, stops = [], finish, rider, pin, overlay, style }: FallbackMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const project = useMemo(
    () =>
      createProjection(line, size.width, size.height, {
        top: size.height * 0.2,
        right: 40,
        bottom: size.height * 0.45,
        left: 40,
      }),
    [line, size.height, size.width],
  );
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };
  const riderPoint = rider ? project(rider.position) : null;

  return (
    <View style={[styles.fill, style]} onLayout={onLayout}>
      <ExpoImage source={mapFallbacks.homeCard} style={StyleSheet.absoluteFill} contentFit="cover" />
      {size.width > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Path
            d={polylinePath(line.map(project))}
            stroke={colors.brand}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
      {size.width > 0
        ? stops.map((stop, index) => {
            const point = project(stop.coordinates);
            return (
              <View
                key={stop.id}
                pointerEvents="none"
                style={[styles.absolute, stop.reached ? { left: point.x - 16, top: point.y - 40 } : { left: point.x - 10, top: point.y - 10 }]}>
                {stop.reached ? <Image source={stopReached} style={styles.stopReached} /> : <StopNumber number={index + 1} />}
              </View>
            );
          })
        : null}
      {size.width > 0 && finish ? (
        <View pointerEvents="none" style={[styles.absolute, { left: project(finish).x - 18, top: project(finish).y - 18 }]}>
          <Image source={finishFlag} style={styles.flag} />
        </View>
      ) : null}
      {size.width > 0 && pin ? (
        <View
          pointerEvents="none"
          style={[styles.absolute, { left: project(pin).x - PIN_SIZE.width / 2, top: project(pin).y - PIN_SIZE.height * 0.92 }]}>
          <Image source={selectedPin} style={styles.pin} />
        </View>
      ) : null}
      {riderPoint && rider ? (
        <View
          pointerEvents="none"
          style={[styles.absolute, { left: riderPoint.x - RIDER_BOX / 2, top: riderPoint.y - RIDER_BOX / 2 }]}>
          <RiderMarker rotation={rider.headingDeg} weakSignal={rider.weakSignal} />
        </View>
      ) : null}
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
  absolute: {
    position: 'absolute',
  },
  riderBox: {
    width: RIDER_BOX,
    height: RIDER_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderRotor: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Places the image so its dot lands on the box centre.
  headingInBox: {
    position: 'absolute',
    left: RIDER_BOX / 2 - HEADING_SIZE.width * HEADING_ANCHOR.x,
    top: RIDER_BOX / 2 - HEADING_SIZE.height * HEADING_ANCHOR.y,
  },
  heading: {
    width: HEADING_SIZE.width,
    height: HEADING_SIZE.height,
  },
  dimmed: {
    opacity: 0.5,
  },
  accuracyRing: {
    position: 'absolute',
    width: ACCURACY_RING,
    height: ACCURACY_RING,
    borderRadius: ACCURACY_RING / 2,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.accuracyRing,
  },
  stopReached: {
    width: 32,
    height: 40,
  },
  flag: {
    width: 36,
    height: 36,
  },
  pin: {
    width: PIN_SIZE.width,
    height: PIN_SIZE.height,
  },
});
