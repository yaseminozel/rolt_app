import { Image } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { mapFallbacks } from '@/components/map/BaseMap';
import { worldPoint, type ScreenPoint } from '@/components/map/mapGeometry';
import {
  createProjection,
  polylinePath,
  type BoxPadding,
} from '@/components/route-builder/routeProjection';
import { hasMapboxToken, mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import type { LngLat } from '@/features/routes/types';
import { colors } from '@/theme';

const TRACK_WIDTH = 4;
const TRACK_CASING = 7;
/** Start / finish: 13 pt white dot with a 3 pt ride-accent ring (08.05 "Başlangıç noktası"). */
const DOT_RADIUS = 5;
const DOT_STROKE = 3;
const MAX_ZOOM = 16;
/** Static Images API limit per side, in points (rendered @2x). */
const MAX_SIDE = 1280;
const DEFAULT_STYLE = 'mapbox/outdoors-v12';
const DEFAULT_PADDING: BoxPadding = { top: 24, right: 24, bottom: 24, left: 24 };

type RideMapPreviewProps = {
  /** Track segments as recorded. */
  track: LngLat[][];
  /** Room kept free around the track, e.g. under an overlapping metrics pill. */
  /** Keep it stable (module-level or memoized). */
  padding?: BoxPadding;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** `mapbox://styles/user/id` → `user/id` for the Static Images API. */
function staticStyleId() {
  const url = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL;
  return url?.startsWith('mapbox://styles/') ? url.slice('mapbox://styles/'.length) : DEFAULT_STYLE;
}

/**
 * A recorded ride on a map, as a picture (08.05 "Sürüş özeti", 08.11, 09.06 "Harita kartı").
 * Not an interactive map (CLAUDE.md: small map cards inside scrolling content are images).
 * With a Mapbox token the base is a Static Images API picture centred and zoomed on the track,
 * so the line drawn on top lines up exactly; offline or without a token the design's map
 * artwork is used and the track is fitted onto it.
 */
export function RideMapPreview({
  track,
  padding = DEFAULT_PADDING,
  overlay,
  style,
}: RideMapPreviewProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [staticFailed, setStaticFailed] = useState(false);
  const points = useMemo(() => track.flat(), [track]);
  const useStatic = hasMapboxToken && !staticFailed && points.length > 1;

  const view = useMemo(() => {
    if (size.width === 0 || points.length === 0) {
      return null;
    }
    if (!useStatic) {
      return { project: createProjection(points, size.width, size.height, padding), uri: null };
    }
    const world = points.map((point) => worldPoint(point, 0));
    const minX = Math.min(...world.map((p) => p.x));
    const maxX = Math.max(...world.map((p) => p.x));
    const minY = Math.min(...world.map((p) => p.y));
    const maxY = Math.max(...world.map((p) => p.y));
    const innerWidth = Math.max(size.width - padding.left - padding.right, 1);
    const innerHeight = Math.max(size.height - padding.top - padding.bottom, 1);
    const zoom = Math.min(
      MAX_ZOOM,
      Math.log2(
        Math.min(
          innerWidth / Math.max(maxX - minX, 1e-9),
          innerHeight / Math.max(maxY - minY, 1e-9),
        ),
      ),
    );
    const scale = 2 ** zoom;
    // Centre of the padded box, in world points at zoom 0.
    const centreX = (minX + maxX) / 2 - (padding.left - padding.right) / 2 / scale;
    const centreY = (minY + maxY) / 2 - (padding.top - padding.bottom) / 2 / scale;
    const lng = (centreX / 512) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * centreY) / 512))) * 180) / Math.PI;
    const width = Math.min(Math.round(size.width), MAX_SIDE);
    const height = Math.min(Math.round(size.height), MAX_SIDE);
    const uri =
      `https://api.mapbox.com/styles/v1/${staticStyleId()}/static/` +
      `${lng.toFixed(6)},${lat.toFixed(6)},${zoom.toFixed(2)}/${width}x${height}@2x` +
      `?access_token=${mapboxToken}`;
    const project = (point: LngLat): ScreenPoint => {
      const p = worldPoint(point, 0);
      return {
        x: size.width / 2 + (p.x - centreX) * scale,
        y: size.height / 2 + (p.y - centreY) * scale,
      };
    };
    return { project, uri };
  }, [padding, points, size, useStatic]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  };

  const segments = view
    ? track.filter((segment) => segment.length > 1).map((segment) => segment.map(view.project))
    : [];
  const start = view && points.length > 0 ? view.project(points[0]) : null;
  const end = view && points.length > 1 ? view.project(points[points.length - 1]) : null;

  return (
    <View style={[styles.frame, style]} onLayout={onLayout}>
      <Image
        source={view?.uri ? { uri: view.uri } : mapFallbacks.explore}
        placeholder={mapFallbacks.explore}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        onError={() => setStaticFailed(true)}
        accessible={false}
      />
      {view ? (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents="none">
          {segments.map((segment, index) => (
            <Path
              key={`casing-${index}`}
              d={polylinePath(segment)}
              fill="none"
              stroke={colors.surface}
              strokeWidth={TRACK_CASING}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {segments.map((segment, index) => (
            <Path
              key={`line-${index}`}
              d={polylinePath(segment)}
              fill="none"
              stroke={colors.accentStrong}
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {[start, end].map((point, index) =>
            point ? (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={DOT_RADIUS}
                fill={colors.surface}
                stroke={colors.accentStrong}
                strokeWidth={DOT_STROKE}
              />
            ) : null,
          )}
        </Svg>
      ) : null}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
});
