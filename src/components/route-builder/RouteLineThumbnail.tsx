import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { boundsOf } from '@/features/routes/geo';
import type { LngLat } from '@/features/routes/types';
import { colors } from '@/theme';

export type RouteLineThumbnailProps = {
  /** Route line in [lng, lat]; fewer than two points draws only the schematic background. */
  geometry: readonly LngLat[];
  height: number;
  /** Faded look of a card whose route is not live (04.6 "Taslak olarak kaydedildi": 55 %). */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LINE_WIDTH = 7;
const ENDPOINT_RADIUS = 6;
const ENDPOINT_OUTLINE = 4;
const ROAD_WIDTH = 10;
/** Inset of the line inside the thumbnail (design: line spans ~50–295 of 345 × 22–116 of 150). */
const INSET_X = 48;
const INSET_Y = 24;
const MUTED_OPACITY = 0.55;
const MAX_POINTS = 200;

/** Decorative white "roads" across the grey ground (design `Yol` rectangles), as fractions. */
const ROADS: readonly [number, number, number, number][] = [
  [-0.05, 0.2, 1.05, 0.46],
  [-0.05, 0.45, 1.05, 0.08],
  [-0.05, 0.7, 1.05, 0.97],
  [-0.05, 0.96, 1.05, 0.6],
];

/**
 * Static schematic of a route line for the small status cards (04.4 / 04.5 / 04.6 "Harita"):
 * grey ground, white roads, the route in accent teal with start (teal) and end (dark) dots.
 * Not a map — no tiles, pins or controls — so it stays cheap inside scroll views and never
 * needs Mapbox. The larger editable preview is `RoutePreviewMap`.
 */
export function RouteLineThumbnail({ geometry, height, muted = false, style }: RouteLineThumbnailProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const points = useMemo(() => projectLine(geometry, width, height), [geometry, width, height]);

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View
      onLayout={onLayout}
      style={[styles.ground, { height }, muted && styles.muted, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ROADS.map(([x1, y1, x2, y2], index) => (
            <Line
              key={index}
              x1={x1 * width}
              y1={y1 * height}
              x2={x2 * width}
              y2={y2 * height}
              stroke={colors.surface}
              strokeWidth={ROAD_WIDTH}
              strokeLinecap="round"
            />
          ))}
          {points.length >= 2 ? (
            <>
              <Path
                d={points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}
                stroke={colors.accent}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Circle
                cx={first[0]}
                cy={first[1]}
                r={ENDPOINT_RADIUS}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={ENDPOINT_OUTLINE}
              />
              <Circle
                cx={last[0]}
                cy={last[1]}
                r={ENDPOINT_RADIUS}
                fill={colors.textPrimary}
                stroke={colors.surface}
                strokeWidth={ENDPOINT_OUTLINE}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * Fits the line into the box, keeping its shape (longitude scaled by cos(latitude)) and
 * centring it. Long lines are thinned to at most `MAX_POINTS` vertices.
 */
function projectLine(geometry: readonly LngLat[], width: number, height: number): [number, number][] {
  if (width <= 0 || geometry.length < 2) {
    return [];
  }
  const step = Math.max(1, Math.ceil(geometry.length / MAX_POINTS));
  const sampled = geometry.filter((_, index) => index % step === 0 || index === geometry.length - 1);
  const { southWest, northEast } = boundsOf([...sampled]);
  const midLatitude = (southWest[1] + northEast[1]) / 2;
  const lngScale = Math.cos((midLatitude * Math.PI) / 180);
  const spanX = (northEast[0] - southWest[0]) * lngScale;
  const spanY = northEast[1] - southWest[1];
  const boxWidth = Math.max(width - INSET_X * 2, 1);
  const boxHeight = Math.max(height - INSET_Y * 2, 1);
  const scale = Math.min(spanX > 0 ? boxWidth / spanX : Infinity, spanY > 0 ? boxHeight / spanY : Infinity);
  const safeScale = Number.isFinite(scale) ? scale : 0;
  const offsetX = (width - spanX * safeScale) / 2;
  const offsetY = (height - spanY * safeScale) / 2;

  return sampled.map(([lng, lat]) => [
    offsetX + (lng - southWest[0]) * lngScale * safeScale,
    offsetY + (northEast[1] - lat) * safeScale,
  ]);
}

const styles = StyleSheet.create({
  ground: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  muted: {
    opacity: MUTED_OPACITY,
  },
});
