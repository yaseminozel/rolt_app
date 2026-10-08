import { Image } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
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
import { trimTrackEnds } from '@/features/rides/trimTrackEnds';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

const TRACK_WIDTH = 4;
const TRACK_CASING = 7;
/** Start / finish: 13 pt white dot with a 3 pt ride-accent ring (08.05 "Başlangıç noktası"). */
const DOT_RADIUS = 5;
const DOT_STROKE = 3;
const MAX_ZOOM = 16;
/** Static Images API limit per side, in points (rendered @2x). */
const MAX_SIDE = 1280;
const DEFAULT_STYLE = 'mapbox/outdoors-v12';
const METRES_PER_DEGREE_LAT = 111_320;
/** Hidden areas stay visible even when the map is zoomed far out. */
const ZONE_MIN_RADIUS = 14;
const ZONE_TAG_WIDTH = 104;
const DEFAULT_PADDING: BoxPadding = { top: 24, right: 24, bottom: 24, left: 24 };
/** "▷" replay (09.06): a marker rides the track from start to finish in this long. */
const REPLAY_MS = 4000;
const REPLAY_RADIUS = 7;

type RideMapPreviewProps = {
  /** Track segments as recorded. */
  track: LngLat[][];
  /** Room kept free around the track, e.g. under an overlapping metrics pill. */
  /** Keep it stable (module-level or memoized). */
  padding?: BoxPadding;
  overlay?: ReactNode;
  /**
   * Privacy preview (10.05): the first and last metres are left out of the line and their areas
   * shaded, with these tags at the start and finish.
   */
  hiddenEnds?: { metres: number; startLabel: string; finishLabel: string };
  /** Line colour; recorded rides use the live-ride accent. */
  trackColor?: string;
  /** Changing it (to a new non-zero value) replays the ride: a marker rides along the track. */
  replayToken?: number;
  style?: StyleProp<ViewStyle>;
};

/** Point at `fraction` (0–1) of the way along screen polylines. */
function pointAlong(lines: ScreenPoint[][], fraction: number): ScreenPoint | null {
  const pieces: { from: ScreenPoint; to: ScreenPoint; length: number }[] = [];
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const from = line[index - 1];
      const to = line[index];
      pieces.push({ from, to, length: Math.hypot(to.x - from.x, to.y - from.y) });
    }
  }
  const total = pieces.reduce((sum, piece) => sum + piece.length, 0);
  if (pieces.length === 0 || total === 0) {
    return null;
  }
  let remaining = Math.min(Math.max(fraction, 0), 1) * total;
  for (const piece of pieces) {
    if (remaining <= piece.length) {
      const t = piece.length === 0 ? 0 : remaining / piece.length;
      return { x: piece.from.x + (piece.to.x - piece.from.x) * t, y: piece.from.y + (piece.to.y - piece.from.y) * t };
    }
    remaining -= piece.length;
  }
  return pieces[pieces.length - 1].to;
}

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
  hiddenEnds,
  trackColor = colors.accentStrong,
  replayToken = 0,
  style,
}: RideMapPreviewProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [replay, setReplay] = useState<number | null>(null);

  useEffect(() => {
    if (!replayToken) {
      return;
    }
    let frame = 0;
    const startedAt = Date.now();
    const step = () => {
      const fraction = (Date.now() - startedAt) / REPLAY_MS;
      if (fraction >= 1) {
        setReplay(null);
        return;
      }
      setReplay(fraction);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [replayToken]);
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

  const visibleTrack = useMemo(
    () => (hiddenEnds ? trimTrackEnds(track, hiddenEnds.metres) : track),
    [hiddenEnds, track],
  );
  const segments = view
    ? visibleTrack
        .filter((segment) => segment.length > 1)
        .map((segment) => segment.map(view.project))
    : [];
  const replayPoint = replay !== null ? pointAlong(segments, replay) : null;
  const start = view && points.length > 0 ? view.project(points[0]) : null;
  const end = view && points.length > 1 ? view.project(points[points.length - 1]) : null;
  // Radius of the hidden areas on screen: from the start to a point that many metres north.
  const zoneRadius =
    view && start && hiddenEnds
      ? Math.max(
          Math.abs(
            view.project([points[0][0], points[0][1] + hiddenEnds.metres / METRES_PER_DEGREE_LAT])
              .y - start.y,
          ),
          ZONE_MIN_RADIUS,
        )
      : 0;

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
              stroke={trackColor}
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {hiddenEnds
            ? [start, end].map((point, index) =>
                point ? (
                  <Circle
                    key={`zone-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={zoneRadius}
                    fill={colors.privacyZone}
                    stroke={colors.brand}
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                ) : null,
              )
            : null}
          {[start, end].map((point, index) =>
            point && !hiddenEnds ? (
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
          {replayPoint ? (
            <Circle
              cx={replayPoint.x}
              cy={replayPoint.y}
              r={REPLAY_RADIUS}
              fill={colors.accentStrong}
              stroke={colors.surface}
              strokeWidth={DOT_STROKE}
            />
          ) : null}
        </Svg>
      ) : null}
      {hiddenEnds && start && end
        ? zoneTags(start, end, zoneRadius, size.width, size.height).map(({ left, top }, index) => (
            <View key={index} pointerEvents="none" style={[styles.zoneTag, { left, top }]}>
              <Text style={styles.zoneTagLabel} numberOfLines={1}>
                {index === 0 ? hiddenEnds.startLabel : hiddenEnds.finishLabel}
              </Text>
            </View>
          ))
        : null}
      {overlay}
    </View>
  );
}

const ZONE_TAG_HEIGHT = 24;

/**
 * Tag positions for the start and finish areas: above each area, or below it when that keeps the
 * two tags apart or on the card; kept inside the card horizontally.
 */
function zoneTags(
  start: ScreenPoint,
  end: ScreenPoint,
  radius: number,
  width: number,
  height: number,
) {
  const place = (point: ScreenPoint, below: boolean) => ({
    left: Math.min(
      Math.max(point.x - ZONE_TAG_WIDTH / 2, spacing.sm),
      width - ZONE_TAG_WIDTH - spacing.sm,
    ),
    top: below
      ? Math.min(point.y + radius + spacing.xs, height - ZONE_TAG_HEIGHT - spacing.xs)
      : Math.max(point.y - radius - ZONE_TAG_HEIGHT - spacing.xs, spacing.xs),
  });
  const first = place(start, start.y - radius - ZONE_TAG_HEIGHT < 0);
  let second = place(end, end.y - radius - ZONE_TAG_HEIGHT < 0);
  const overlaps = (a: { left: number; top: number }, b: { left: number; top: number }) =>
    Math.abs(a.left - b.left) < ZONE_TAG_WIDTH && Math.abs(a.top - b.top) < ZONE_TAG_HEIGHT;
  if (overlaps(first, second)) {
    second = place(end, second.top <= first.top);
  }
  return [first, second];
}

const styles = StyleSheet.create({
  zoneTag: {
    position: 'absolute',
    width: ZONE_TAG_WIDTH,
    height: ZONE_TAG_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapLabel,
  },
  zoneTagLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
});
