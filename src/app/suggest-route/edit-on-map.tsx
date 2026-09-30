import { router, useNavigation } from 'expo-router';
import { DragHandGesture, InfoCircle, Magnet, MapsArrow, NavArrowLeft, Plus, Redo, Undo } from 'iconoir-react-native';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayersIcon } from '@/components/explore/LayersIcon';
import { InfoNote } from '@/components/feedback/InfoNote';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { cameraBoundsFor } from '@/components/map/mapGeometry';
import type { MapStyle } from '@/components/map/mapStyles';
import { MapZoomControl } from '@/components/map/MapZoomControl';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { MapPill } from '@/components/route-builder/MapPill';
import { RoutePreviewMap } from '@/components/route-builder/RoutePreviewMap';
import { WaypointBadge } from '@/components/route-builder/WaypointBadge';
import { WaypointList } from '@/components/route-builder/WaypointList';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { formatRouteSummary, placeShortLabel } from '@/features/route-suggestion/placeFormat';
import {
  isPlaced,
  legPaths,
  nearestLeg,
  pathLengthKm,
  pathMidpoint,
  straightPreview,
  type PlacedWaypoint,
} from '@/features/route-suggestion/routeEditing';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { placeSearch, routing } from '@/features/route-suggestion/services';
import { MAX_STOPS, type RoutePreview, type Waypoint } from '@/features/route-suggestion/types';
import type { LngLat } from '@/features/routes/types';
import { formatDistance } from '@/i18n/format';
import { colors, fontFamily, layout, radius, shadows, spacing, typography } from '@/theme';

type CameraRef = ComponentRef<MapboxModule['Camera']>;
type RouteResult = { status: 'ready'; preview: RoutePreview } | { status: 'error' };
type History = { entries: PlacedWaypoint[][]; index: number };

const TOP_BAR_HEIGHT = 48;
/** Panel height before it is measured (design `BGoSf`). */
const PANEL_ESTIMATE = 231;
const CONTROLS_GAP = spacing.lg;
const ROUTE_DELAY_MS = 300;
/** Deltas below this are rounding noise, not a different route. */
const MIN_DELTA_KM = 0.5;
const CASING_WIDTH = 12;
const LINE_WIDTH = 6;
const HANDLE_SIZE = 16;
const TOOL_SIZE = 40;
const CAMERA_ANIMATION_MS = 600;

let stopCounter = 0;
const newStopId = () => `wp-map-${Date.now().toString(36)}-${(stopCounter += 1)}`;
const keyOf = (waypoints: PlacedWaypoint[]) => JSON.stringify(waypoints.map((waypoint) => waypoint.place.coordinates));

/**
 * 04.1 "Haritada düzenle" (`JgPGO`): the route on a full-screen map with draggable A / stop / B
 * markers. Dragging a teal handle in the middle of a leg, long-pressing the map or tapping the
 * line adds a stop there; tapping a stop offers to remove it. The panel shows the new distance and
 * time, the change against the route on opening, undo / redo, "Yola yapıştır" and "+ Ara durak".
 *
 * "Yola yapıştır" on: every change is routed (Directions, debounced). Off: straight segments while
 * editing, no requests; "Bitti" routes once so the suggestion stays a rideable road.
 *
 * Expo Go / web: the design artwork with the route drawn schematically over it, and the stop list
 * for editing (reorder, swap, remove, add), since markers can't be dragged without the native map.
 */
export default function EditRouteOnMapScreen() {
  const { t } = useTranslation(['routeSuggestion', 'common']);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { position, locate } = useDeviceLocation();
  const { draft, applyEditedRoute } = useRouteSuggestion();

  const [initial] = useState(() => ({
    waypoints: draft.waypoints.filter(isPlaced),
    preview: draft.preview,
  }));
  const initialKey = keyOf(initial.waypoints);
  const [history, setHistory] = useState<History>({ entries: [initial.waypoints], index: 0 });
  const [routes, setRoutes] = useState<Record<string, RouteResult>>(() =>
    initial.preview ? { [initialKey]: { status: 'ready', preview: initial.preview } } : {},
  );
  const [snap, setSnap] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const [panelHeight, setPanelHeight] = useState(PANEL_ESTIMATE);
  const cameraRef = useRef<CameraRef>(null);
  const zoomRef = useRef<number | null>(null);
  const finished = useRef(false);
  const dragging = useRef(false);

  const waypoints = history.entries[history.index];
  const coordinates = useMemo(() => waypoints.map((waypoint) => waypoint.place.coordinates), [waypoints]);
  const routeKey = keyOf(waypoints);
  const dirty = routeKey !== initialKey;
  const initialDistance = initial.preview?.distanceKm ?? null;
  const pace = initial.preview && initial.preview.distanceKm > 0 ? initial.preview.durationMinutes / initial.preview.distanceKm : undefined;
  const stopCount = waypoints.length - 2;

  // Leaving with changes asks first (back button, swipe back).
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (finished.current || !dirty) {
          return;
        }
        event.preventDefault();
        Alert.alert(t('editOnMap.discardTitle'), t('editOnMap.discardMessage'), [
          { text: t('editOnMap.keepEditing'), style: 'cancel' },
          {
            text: t('editOnMap.discard'),
            style: 'destructive',
            onPress: () => {
              finished.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [dirty, navigation, t],
  );

  // Road route for the current points ("Yola yapıştır" on), cached per point set for undo / redo.
  const snapped = routes[routeKey] as RouteResult | undefined;
  useEffect(() => {
    if (!snap || snapped || coordinates.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      routing
        .route(coordinates)
        .then((preview) => !cancelled && setRoutes((current) => ({ ...current, [routeKey]: { status: 'ready', preview } })))
        .catch(() => !cancelled && setRoutes((current) => ({ ...current, [routeKey]: { status: 'error' } })));
    }, ROUTE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coordinates, routeKey, snap, snapped]);

  const status: 'loading' | 'ready' | 'error' = snap ? (snapped?.status ?? 'loading') : 'ready';
  const preview: RoutePreview | null = snap
    ? snapped?.status === 'ready'
      ? snapped.preview
      : null
    : straightPreview(coordinates, pace);
  const legs = useMemo(() => legPaths(coordinates, preview?.geometry ?? null), [coordinates, preview]);
  const midpoints = useMemo(() => legs.map(pathMidpoint), [legs]);

  // ---- Editing ----------------------------------------------------------------------------

  const commit = (next: PlacedWaypoint[]) =>
    setHistory((current) => ({ entries: [...current.entries.slice(0, current.index + 1), next], index: current.index + 1 }));

  /** Names a moved or new point once the address is known, without adding an undo step. */
  const nameLater = (waypointId: string, point: LngLat) => {
    placeSearch
      .reverse(point)
      .then((place) =>
        setHistory((current) => ({
          ...current,
          entries: current.entries.map((entry) =>
            entry.map((waypoint) =>
              waypoint.id === waypointId && waypoint.place.coordinates === point
                ? { ...waypoint, place: { ...place, coordinates: point } }
                : waypoint,
            ),
          ),
        })),
      )
      .catch(() => undefined);
  };

  const droppedPlace = (point: LngLat) => ({ id: `point-${point[0]},${point[1]}`, name: t('pickOnMap.droppedPin'), coordinates: point });

  const moveWaypoint = (waypointId: string, point: LngLat) => {
    commit(waypoints.map((waypoint) => (waypoint.id === waypointId ? { ...waypoint, place: droppedPlace(point) } : waypoint)));
    nameLater(waypointId, point);
  };

  const insertStop = (leg: number, point: LngLat) => {
    if (stopCount >= MAX_STOPS) {
      showToast({ variant: 'failure', message: t('location.maxStops', { count: MAX_STOPS }), bottomOffset: panelHeight });
      return;
    }
    const stop: PlacedWaypoint = { id: newStopId(), kind: 'stop', place: droppedPlace(point) };
    commit([...waypoints.slice(0, leg + 1), stop, ...waypoints.slice(leg + 1)]);
    nameLater(stop.id, point);
  };

  const insertStopNear = (point: LngLat) => insertStop(nearestLeg(point, legs), point);

  const addStopOnLongestLeg = () => {
    const longest = legs.reduce((best, path, leg) => (pathLengthKm(path) > pathLengthKm(legs[best]) ? leg : best), 0);
    if (legs[longest]) {
      insertStop(longest, pathMidpoint(legs[longest]));
    }
  };

  const removeStop = (waypointId: string) => commit(waypoints.filter((waypoint) => waypoint.id !== waypointId));

  const confirmRemoveStop = (stop: PlacedWaypoint) =>
    Alert.alert(t('editOnMap.removeStopTitle', { name: placeShortLabel(stop.place) }), undefined, [
      { text: t('editOnMap.cancel'), style: 'cancel' },
      { text: t('editOnMap.removeStop'), style: 'destructive', onPress: () => removeStop(stop.id) },
    ]);

  const moveStopInList = (from: number, to: number) => {
    const next = [...waypoints];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const swapEnds = () => {
    const last = waypoints.length - 1;
    commit(
      waypoints.map((waypoint, index) =>
        index === 0 ? { ...waypoint, place: waypoints[last].place } : index === last ? { ...waypoint, place: waypoints[0].place } : waypoint,
      ),
    );
  };

  const undo = () => setHistory((current) => ({ ...current, index: Math.max(current.index - 1, 0) }));
  const redo = () => setHistory((current) => ({ ...current, index: Math.min(current.index + 1, current.entries.length - 1) }));

  const finish = async () => {
    let result = preview;
    if (!snap) {
      setFinishing(true);
      try {
        result = await routing.route(coordinates);
      } catch {
        showToast({ variant: 'failure', message: t('preview.error'), bottomOffset: panelHeight });
        return;
      } finally {
        setFinishing(false);
      }
    }
    if (!result) {
      return;
    }
    finished.current = true;
    applyEditedRoute(waypoints as Waypoint[], result);
    router.back();
  };

  // ---- Map ----------------------------------------------------------------------------------

  const topReserved = insets.top + TOP_BAR_HEIGHT;
  const [initialCamera] = useState(() => {
    const points = initial.preview?.geometry.length ? initial.preview.geometry : initial.waypoints.map((waypoint) => waypoint.place.coordinates);
    return points.length > 1
      ? {
          bounds: cameraBoundsFor(points, {
            top: topReserved + spacing.xxl,
            right: 72,
            bottom: PANEL_ESTIMATE + insets.bottom + spacing.xxl,
            left: spacing.xxxl,
          }),
        }
      : { centerCoordinate: points[0], zoomLevel: 11 };
  });

  const lineShape = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: preview?.geometry ?? coordinates },
    }),
    [coordinates, preview],
  );

  const handleLocate = async () => {
    const point = await locate();
    if (!point) {
      showToast({ variant: 'failure', message: t('search.locationUnavailable'), bottomOffset: panelHeight });
      return;
    }
    cameraRef.current?.setCamera({ centerCoordinate: point, zoomLevel: 13, animationDuration: CAMERA_ANIMATION_MS });
  };

  const zoomBy = (delta: number) => {
    if (zoomRef.current !== null) {
      cameraRef.current?.zoomTo(zoomRef.current + delta, 300);
    }
  };

  // Annotations re-mount after each edit so a dragged marker snaps to its stored position.
  const version = `${history.index}-${history.entries.length}`;
  const showHint = history.entries.length === 1 && midpoints.length > 0;
  const markerLabel = (waypoint: PlacedWaypoint) =>
    t(`editOnMap.${waypoint.kind}Marker`, { name: placeShortLabel(waypoint.place) });

  // ---- Panel --------------------------------------------------------------------------------

  const summaryPreview = preview ?? (snapped?.status === 'ready' ? snapped.preview : null);
  // Straight segments are always shorter than roads, so the change is only meaningful when snapped.
  const delta = snap && summaryPreview && initialDistance !== null ? summaryPreview.distanceKm - initialDistance : 0;
  const controlsBottom = panelHeight + CONTROLS_GAP;

  return (
    <View style={styles.screen}>
      <BaseMap
        fallbackImage={mapFallbacks.explore}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        onLongPress={(feature) => insertStopNear(feature.geometry.coordinates as LngLat)}
        onCameraChanged={(state) => {
          zoomRef.current = state.properties.zoom;
        }}
        onMapIdle={(state) => {
          zoomRef.current = state.properties.zoom;
        }}
        renderLayers={(Mapbox) => (
          <>
            <Mapbox.Camera ref={cameraRef} defaultSettings={initialCamera} />
            <Mapbox.ShapeSource
              id="edit-route"
              shape={lineShape}
              hitbox={{ width: 24, height: 24 }}
              onPress={(event) => insertStopNear([event.coordinates.longitude, event.coordinates.latitude])}>
              <Mapbox.LineLayer
                id="edit-route-casing"
                style={{ lineColor: colors.surface, lineWidth: CASING_WIDTH, lineCap: 'round', lineJoin: 'round' }}
              />
              <Mapbox.LineLayer
                id="edit-route-line"
                style={{
                  lineColor: colors.routePlanLine,
                  lineWidth: LINE_WIDTH,
                  lineOpacity: status === 'ready' ? 1 : 0.5,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
            {midpoints.map((point, leg) => (
              <Mapbox.PointAnnotation
                key={`handle-${leg}-${version}`}
                id={`handle-${leg}-${version}`}
                coordinate={point}
                draggable
                onDragEnd={(payload) => insertStop(leg, payload.geometry.coordinates as LngLat)}>
                <View style={styles.handle} accessibilityLabel={t('editOnMap.dragHandle')} />
              </Mapbox.PointAnnotation>
            ))}
            {waypoints.map((waypoint) => (
              <Mapbox.PointAnnotation
                key={`${waypoint.id}-${version}`}
                id={`${waypoint.id}-${version}`}
                coordinate={waypoint.place.coordinates}
                draggable
                onSelected={
                  waypoint.kind === 'stop'
                    ? () => {
                        // A drag can select the annotation first; only a plain tap offers removal.
                        if (!dragging.current) {
                          confirmRemoveStop(waypoint);
                        }
                      }
                    : undefined
                }
                onDragStart={() => {
                  dragging.current = true;
                }}
                onDragEnd={(payload) => {
                  dragging.current = false;
                  moveWaypoint(waypoint.id, payload.geometry.coordinates as LngLat);
                }}>
                <View accessibilityLabel={markerLabel(waypoint)}>
                  <WaypointBadge kind={waypoint.kind} size="map" />
                </View>
              </Mapbox.PointAnnotation>
            ))}
            {waypoints
              .filter((waypoint) => waypoint.kind === 'stop')
              .map((stop) => (
                <Mapbox.MarkerView key={`label-${stop.id}`} coordinate={stop.place.coordinates} anchor={{ x: 0, y: 0.5 }} allowOverlap>
                  <View style={styles.stopLabelOffset} pointerEvents="none">
                    <Text style={styles.stopLabel} numberOfLines={1}>
                      {stop.place.name}
                    </Text>
                  </View>
                </Mapbox.MarkerView>
              ))}
            {showHint ? (
              <Mapbox.MarkerView coordinate={midpoints[0]} anchor={{ x: 0, y: 0.5 }} allowOverlap>
                <View style={styles.hintOffset} pointerEvents="none">
                  <MapPill label={t('editOnMap.hint')} tone="inverse" icon={DragHandGesture} style={styles.hint} />
                </View>
              </Mapbox.MarkerView>
            ) : null}
            {position ? <Mapbox.LocationPuck puckBearingEnabled={false} /> : null}
          </>
        )}
      />

      {isNativeMapAvailable ? null : (
        <RoutePreviewMap
          overlay
          preview={preview}
          waypoints={waypoints}
          status={status}
          style={[styles.fallbackOverlay, { top: topReserved + spacing.lg, bottom: panelHeight + spacing.lg }]}
        />
      )}

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('common:actions.back')} onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {t('editOnMap.title')}
        </Text>
        <MapActionButton
          icon={LayersIcon}
          accessibilityLabel={t('map.satellite')}
          selected={mapStyle === 'satellite'}
          disabled={!isNativeMapAvailable}
          onPress={() => setMapStyle((current) => (current === 'satellite' ? 'default' : 'satellite'))}
        />
      </View>

      {status !== 'ready' ? (
        <View style={[styles.statusRow, { top: topReserved + spacing.md }]} pointerEvents="none">
          {status === 'loading' ? (
            <MapPill label={t('preview.loading')} loading />
          ) : (
            <MapPill label={t('preview.error')} tone="danger" emphasized />
          )}
        </View>
      ) : null}

      {isNativeMapAvailable ? (
        <View style={[styles.controls, { bottom: controlsBottom }]} pointerEvents="box-none">
          <MapActionButton icon={MapsArrow} size="control" accessibilityLabel={t('map.locateMe')} onPress={handleLocate} />
          <MapZoomControl
            zoomInLabel={t('map.zoomIn')}
            zoomOutLabel={t('map.zoomOut')}
            onZoomIn={() => zoomBy(1)}
            onZoomOut={() => zoomBy(-1)}
          />
        </View>
      ) : null}

      <View
        style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}
        onLayout={(event: LayoutChangeEvent) => setPanelHeight(event.nativeEvent.layout.height)}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryText} accessible accessibilityLiveRegion="polite">
            <Text style={[styles.summary, status !== 'ready' && styles.summaryPending]} numberOfLines={1}>
              {summaryPreview ? formatRouteSummary(summaryPreview, false) : ' '}
            </Text>
            {Math.abs(delta) >= MIN_DELTA_KM ? (
              <Text style={[styles.delta, { color: delta > 0 ? colors.warning : colors.success }]} numberOfLines={1}>
                {t(delta > 0 ? 'editOnMap.deltaLonger' : 'editOnMap.deltaShorter', { distance: formatDistance(Math.abs(delta)) })}
              </Text>
            ) : null}
          </View>
          <View style={styles.tools}>
            <ToolButton icon={Undo} label={t('editOnMap.undo')} disabled={history.index === 0} onPress={undo} />
            <ToolButton
              icon={Redo}
              label={t('editOnMap.redo')}
              disabled={history.index === history.entries.length - 1}
              onPress={redo}
            />
          </View>
        </View>

        {isNativeMapAvailable ? null : (
          <>
            <InfoNote text={t('editOnMap.fallbackNote')} icon={InfoCircle} />
            <ScrollView style={{ maxHeight: screenHeight * 0.3 }} showsVerticalScrollIndicator={false}>
              <WaypointList
                waypoints={waypoints}
                onSwap={swapEnds}
                onRemoveStop={removeStop}
                onMoveStop={moveStopInList}
              />
            </ScrollView>
          </>
        )}

        <View style={styles.snapRow}>
          <Magnet width={18} height={18} color={colors.textPrimary} strokeWidth={1.8} />
          <View style={styles.snapText}>
            <Text style={styles.snapTitle}>{t('editOnMap.snapTitle')}</Text>
            <Text style={styles.snapDescription}>{snap ? t('editOnMap.snapOn') : t('editOnMap.snapOff')}</Text>
          </View>
          <Switch value={snap} onValueChange={setSnap} tone="accent" accessibilityLabel={t('editOnMap.snapTitle')} />
        </View>

        <View style={styles.actions}>
          <Button
            label={t('editOnMap.addStop')}
            icon={Plus}
            variant="outlined"
            size="lg"
            disabled={stopCount >= MAX_STOPS || legs.length === 0}
            onPress={addStopOnLongestLeg}
            style={styles.action}
          />
          <Button
            label={t('editOnMap.done')}
            size="lg"
            loading={finishing}
            disabled={snap ? status !== 'ready' : false}
            onPress={finish}
            style={styles.action}
          />
        </View>
      </View>
    </View>
  );
}

type ToolButtonProps = {
  icon: typeof Undo;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

/** Round undo / redo buttons of the edit panel (`FnjUn`, `N72nN6`). */
function ToolButton({ icon: Icon, label, disabled, onPress }: ToolButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={(layout.minTouchTarget - TOOL_SIZE) / 2}
      style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]}>
      <Icon width={18} height={18} color={disabled ? colors.textDisabled : colors.textPrimary} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  statusRow: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    alignItems: 'center',
  },
  fallbackOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  controls: {
    position: 'absolute',
    right: layout.screenGutter,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.routePlanLine,
    backgroundColor: colors.surface,
  },
  stopLabelOffset: {
    paddingLeft: 18,
  },
  stopLabel: {
    maxWidth: 140,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapPill,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textPrimary,
  },
  hintOffset: {
    paddingLeft: spacing.xl,
  },
  hint: {
    borderRadius: radius.chip,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 14,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapSheet,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryText: {
    flex: 1,
    gap: spacing.xxs,
  },
  summary: {
    ...typography.bodyLargeSemibold,
    color: colors.textPrimary,
  },
  summaryPending: {
    color: colors.textTertiary,
  },
  delta: {
    ...typography.captionMedium,
  },
  tools: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tool: {
    width: TOOL_SIZE,
    height: TOOL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  toolPressed: {
    backgroundColor: colors.surfacePressed,
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  snapText: {
    flex: 1,
    gap: 1,
  },
  snapTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  snapDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
