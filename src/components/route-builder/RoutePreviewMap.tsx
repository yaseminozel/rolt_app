import { EditPencil, InfoCircle, Xmark } from 'iconoir-react-native';
import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { formatRouteSummary } from '@/features/route-suggestion/placeFormat';
import { isPlaced, pathMidpoint, type PlacedWaypoint } from '@/features/route-suggestion/routeEditing';
import type { RoutePreview, Waypoint } from '@/features/route-suggestion/types';
import type { LngLat } from '@/features/routes/types';
import { colors, radius, spacing } from '@/theme';

import { MapPill } from './MapPill';
import { createProjection, polylinePath, type BoxPadding, type ScreenPoint } from './routeProjection';
import { WaypointBadge } from './WaypointBadge';

export type RoutePreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export type RoutePreviewMapProps = {
  preview: RoutePreview | null;
  waypoints: Waypoint[];
  status?: RoutePreviewStatus;
  /** Text for the error pill, e.g. "Rota oluşturulamadı". */
  errorLabel?: string;
  /** Shown when there is no line yet. */
  emptyMessage?: string;
  /** Shows the "Haritada düzenle" pill when given. */
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Loading pill text; defaults to "En uygun yol aranıyor". */
  loadingLabel?: string;
  /** Waypoint the route can't reach: the red ✕ sits on the segment leading to it. */
  errorWaypointId?: string | null;
  /**
   * Draws only the line and markers over a transparent background (no "road" pattern, pills or
   * location dot), e.g. on top of the Expo Go map artwork.
   */
  overlay?: boolean;
};

/** Design card height (04.1 `laiIW`); the error state passes a shorter one through `style`. */
const DEFAULT_HEIGHT = 180;
const ROUTE_WIDTH = 7;
const STRAIGHT_WIDTH = 2;
const PILL_INSET = spacing.md;
const MARKER_SIZE = 24;
const STOP_SIZE = 14;
const ERROR_MARK_SIZE = 24;
const LOCATION_HALO = 44;
const LOCATION_DOT = 18;
/** Keeps markers below the distance / error pill (12 inset + 27 pill + 12). */
const TOP_PILL_CLEARANCE = 51;
/** The card is a schematic: one axis may be stretched up to 2.5× so short spans stay readable. */
const SCHEMATIC_STRETCH = 2.5;

/**
 * Light "road" strokes behind the line (04.1 `hHytc` "Yol"): five 10 pt white bands, 38 pt apart,
 * alternating −6° / +8° (Pencil rotates counter-clockwise, SVG clockwise), 51 pt wider than the card.
 */
const ROAD_BANDS = [
  { y: 24, rotation: -6 },
  { y: 62, rotation: 8 },
  { y: 100, rotation: -6 },
  { y: 138, rotation: 8 },
  { y: 176, rotation: -6 },
];
const ROAD_X = -20;
const ROAD_OVERHANG = 51;
const ROAD_HEIGHT = 10;

/**
 * Schematic route card of 04.1 (`laiIW`, `uFXSB`, `L0d2HN`, `WwIGh`): light map-like background,
 * the route line in teal with A / stop / B markers, "73 km · ~1 sa 45 dk" top-left and
 * "Haritada düzenle" bottom-right. Drawn with SVG by projecting the geometry into the card, so it
 * works without Mapbox (Expo Go, web, lists).
 *
 * States: `idle` → rider dot + `emptyMessage`; `loading` → thin grey straight line through the
 * points + "En uygun yol aranıyor"; `ready` → road line + distance pill; `error` → faded red
 * straight line, red ✕ and the `errorLabel` pill.
 */
export function RoutePreviewMap({
  preview,
  waypoints,
  status,
  errorLabel,
  emptyMessage,
  onEdit,
  style,
  loadingLabel,
  errorWaypointId,
  overlay = false,
}: RoutePreviewMapProps): JSX.Element {
  const { t } = useTranslation('routeSuggestion');
  const [size, setSize] = useState({ width: 0, height: 0 });

  const placed = useMemo(() => waypoints.filter(isPlaced), [waypoints]);
  const resolvedStatus: RoutePreviewStatus = status ?? (preview ? 'ready' : 'idle');
  const showRoad = resolvedStatus === 'ready' && preview !== null && preview.geometry.length >= 2;
  const pointCoordinates = useMemo(() => placed.map((waypoint) => waypoint.place.coordinates), [placed]);

  const hasTopPill = resolvedStatus === 'ready' || resolvedStatus === 'error';
  const projection = useMemo(() => {
    const { width, height } = size;
    const padding: BoxPadding = overlay
      ? { top: height * 0.2, right: width * 0.15, bottom: height * 0.2, left: width * 0.15 }
      : { top: Math.max(height * 0.24, hasTopPill ? TOP_PILL_CLEARANCE : 0), right: 52, bottom: height * 0.25, left: 52 };
    const fitted = showRoad && preview ? [...preview.geometry, ...pointCoordinates] : pointCoordinates;
    // Straight "as the crow flies" sketches (loading, error) span the card like the design; the
    // road line keeps its shape within `SCHEMATIC_STRETCH`.
    const stretch = overlay ? 1 : showRoad ? SCHEMATIC_STRETCH : Infinity;
    return createProjection(fitted, width, height, padding, stretch);
  }, [hasTopPill, overlay, pointCoordinates, preview, showRoad, size]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const measured = size.width > 0 && size.height > 0;
  const linePoints: ScreenPoint[] = showRoad && preview ? preview.geometry.map(projection) : pointCoordinates.map(projection);
  const errorMark = resolvedStatus === 'error' ? errorMarkPoint(placed, errorWaypointId ?? null) : null;

  const summary = resolvedStatus === 'ready' && preview ? formatRouteSummary(preview, true) : null;
  const statusText =
    resolvedStatus === 'loading'
      ? (loadingLabel ?? t('preview.loading'))
      : resolvedStatus === 'error'
        ? errorLabel
        : resolvedStatus === 'idle'
          ? emptyMessage
          : summary;

  return (
    <View style={[overlay ? styles.overlay : styles.card, style]} onLayout={handleLayout}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="image"
        accessibilityLabel={[t('preview.a11y'), statusText].filter(Boolean).join(', ')}>
        {measured ? (
          <Svg width={size.width} height={size.height}>
            {overlay
              ? null
              : ROAD_BANDS.map(({ y, rotation }) => (
                  <Rect
                    key={y}
                    x={ROAD_X}
                    y={y}
                    width={size.width + ROAD_OVERHANG}
                    height={ROAD_HEIGHT}
                    rx={ROAD_HEIGHT / 2}
                    fill={colors.surface}
                    transform={`rotate(${-rotation} ${ROAD_X} ${y})`}
                  />
                ))}
            {linePoints.length >= 2 ? (
              showRoad ? (
                <Path
                  d={polylinePath(linePoints)}
                  stroke={colors.routePlanLine}
                  strokeWidth={ROUTE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : (
                <Path
                  d={polylinePath(linePoints)}
                  stroke={resolvedStatus === 'error' ? colors.dangerText : colors.textTertiary}
                  strokeOpacity={resolvedStatus === 'error' ? 0.5 : 1}
                  strokeWidth={STRAIGHT_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )
            ) : null}
          </Svg>
        ) : null}

        {measured && placed.length === 0 && !overlay ? (
          <LocationDot centre={{ x: size.width / 2, y: size.height / 2 }} />
        ) : null}

        {measured
          ? placed.map((waypoint) => {
              const point = projection(waypoint.place.coordinates);
              const markerSize = waypoint.kind === 'stop' ? STOP_SIZE : MARKER_SIZE;
              return (
                <View
                  key={waypoint.id}
                  style={[styles.marker, { left: point.x - markerSize / 2, top: point.y - markerSize / 2 }]}>
                  <WaypointBadge kind={waypoint.kind} size="card" />
                </View>
              );
            })
          : null}

        {measured && errorMark ? <ErrorMark point={midpointOf(projection(errorMark[0]), projection(errorMark[1]))} /> : null}
      </View>

      {overlay ? null : (
        <>
          {resolvedStatus === 'ready' && summary ? (
            <MapPill label={summary} tone="inverse" emphasized style={styles.topLeft} />
          ) : null}
          {resolvedStatus === 'error' && errorLabel ? (
            <MapPill label={errorLabel} tone="danger" emphasized style={styles.topLeft} />
          ) : null}
          {resolvedStatus === 'loading' ? (
            <View style={styles.centreRow} pointerEvents="none">
              <MapPill label={loadingLabel ?? t('preview.loading')} loading />
            </View>
          ) : null}
          {resolvedStatus === 'idle' && emptyMessage ? (
            <View style={styles.bottomRow} pointerEvents="none">
              <MapPill label={emptyMessage} tone="translucent" icon={InfoCircle} />
            </View>
          ) : null}
          {resolvedStatus === 'ready' && onEdit ? (
            <MapPill
              label={t('preview.edit')}
              icon={EditPencil}
              emphasized
              onPress={onEdit}
              style={styles.bottomRight}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * Straight segment on which the ✕ is drawn: the one leading into the unreachable waypoint (or
 * leaving it when it is the start), else the whole line's middle segment.
 */
function errorMarkPoint(placed: PlacedWaypoint[], errorWaypointId: string | null): [LngLat, LngLat] | null {
  if (placed.length < 2) {
    return null;
  }
  const index = placed.findIndex((waypoint) => waypoint.id === errorWaypointId);
  if (index > 0) {
    return [placed[index - 1].place.coordinates, placed[index].place.coordinates];
  }
  if (index === 0) {
    return [placed[0].place.coordinates, placed[1].place.coordinates];
  }
  const midpoint = pathMidpoint(placed.map((waypoint) => waypoint.place.coordinates));
  return [midpoint, midpoint];
}

const midpointOf = (a: ScreenPoint, b: ScreenPoint): ScreenPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function ErrorMark({ point }: { point: ScreenPoint }) {
  return (
    <View style={[styles.errorMark, { left: point.x - ERROR_MARK_SIZE / 2, top: point.y - ERROR_MARK_SIZE / 2 }]}>
      <Xmark width={13} height={13} color={colors.textInverse} strokeWidth={2.2} />
    </View>
  );
}

/** Rider position placeholder of the empty card (04.1 `XrNal` "Konumum" + "Hale"). */
function LocationDot({ centre }: { centre: ScreenPoint }) {
  return (
    <>
      <View
        style={[
          styles.locationHalo,
          { left: centre.x - LOCATION_HALO / 2, top: centre.y - LOCATION_HALO / 2 },
        ]}
      />
      <View
        style={[styles.locationDot, { left: centre.x - LOCATION_DOT / 2, top: centre.y - LOCATION_DOT / 2 }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    height: DEFAULT_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  overlay: {
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
  },
  errorMark: {
    position: 'absolute',
    width: ERROR_MARK_SIZE,
    height: ERROR_MARK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.dangerText,
  },
  locationHalo: {
    position: 'absolute',
    width: LOCATION_HALO,
    height: LOCATION_HALO,
    borderRadius: radius.pill,
    backgroundColor: colors.locationHalo,
  },
  locationDot: {
    position: 'absolute',
    width: LOCATION_DOT,
    height: LOCATION_DOT,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.brand,
  },
  topLeft: {
    position: 'absolute',
    top: PILL_INSET,
    left: PILL_INSET,
  },
  bottomRight: {
    position: 'absolute',
    right: PILL_INSET,
    bottom: 15,
  },
  centreRow: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    position: 'absolute',
    left: PILL_INSET,
    right: PILL_INSET,
    bottom: 19,
    alignItems: 'center',
  },
});
