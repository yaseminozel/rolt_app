import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Gas, NavArrowLeft, NavigatorAlt, PathArrow, Wrench } from 'iconoir-react-native';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  ExploreRouteLines,
  OTHER_LINE,
  SELECTED_LINE,
} from '@/components/explore/ExploreRouteLines';
import { LayersIcon } from '@/components/explore/LayersIcon';
import { MapCategoryChip } from '@/components/explore/MapCategoryChip';
import { routeTagBadgeTone } from '@/components/explore/routeTagBadgeTone';
import { SelectedRouteSummary } from '@/components/explore/SelectedRouteSummary';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import {
  cameraBoundsFor,
  clusterMarkers,
  routeMidpoint,
  worldPoint,
  type MapPadding,
  type ScreenPoint,
} from '@/components/map/mapGeometry';
import type { MapStyle } from '@/components/map/mapStyles';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { ROUTE_CLUSTER_SIZE, RouteClusterMarker } from '@/components/map/RouteClusterMarker';
import {
  ROUTE_ENDPOINT_MARKER_WIDTH,
  ROUTE_FINISH_MARKER_ANCHOR,
  ROUTE_FINISH_MARKER_OFFSET,
  ROUTE_START_MARKER_ANCHOR,
  ROUTE_START_MARKER_OFFSET,
  RouteEndpointMarker,
} from '@/components/map/RouteEndpointMarker';
import {
  ROUTE_PHOTO_PIN_ANCHOR,
  ROUTE_PHOTO_PIN_SIZE,
  RoutePhotoPin,
} from '@/components/map/RoutePhotoPin';
import { RouteCard } from '@/components/route/RouteCard';
import { createProjection, polylinePath } from '@/components/route-builder/routeProjection';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { useRoutesInArea } from '@/features/routes/queries';
import type { Bounds, LngLat, Route, RouteFilter, RouteTag } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

type CameraRef = ComponentRef<MapboxModule['Camera']>;
type MapViewProps = ComponentProps<MapboxModule['MapView']>;
type MapState = Parameters<NonNullable<MapViewProps['onMapIdle']>>[0];

/** Antalya coast from Kaş to Antalya, where the mock routes are. */
const INITIAL_AREA: Bounds = { southWest: [29.35, 36.15], northEast: [30.95, 37.12] };
/** Sheet chips (07.01 "Rota kategorileri"): "Tümü" and the five tags the design lists. */
const FILTERS: RouteFilter[] = ['all', 'coast', 'curvy', 'scenic', 'city', 'nature'];
/** Markers closer than this on screen merge into one "N rota" badge (the cluster's 72 pt halo). */
const CLUSTER_DISTANCE = ROUTE_CLUSTER_SIZE;

/** Header (07.01 "MapExploreSearchBar + CategoryChips"): 4 top, 44 search row, 8, 44 chip row. */
const HEADER_HEIGHT = 4 + 44 + spacing.sm + 44;
/** Sheet handle area: 8 top + 4 grabber + 12 bottom. */
const HANDLE_HEIGHT = 8 + 4 + 12;
const TITLE_HEIGHT = 36;
const CHIPS_HEIGHT = 34;
const CARD_HEIGHT = 191;
const SHEET_COLLAPSED_HEIGHT = HANDLE_HEIGHT + TITLE_HEIGHT + spacing.sm;
const SHEET_LIST_HEIGHT =
  HANDLE_HEIGHT + TITLE_HEIGHT + spacing.lg + CHIPS_HEIGHT + spacing.lg + CARD_HEIGHT + spacing.lg;
/** Selected-route sheet before its content is measured: pill, summary, actions. */
const SELECTED_CONTENT_ESTIMATE = 32 + spacing.lg + 122 + spacing.lg + 44;
/** Map buttons keep 16 pt above the sheet. */
const CONTROLS_GAP = spacing.lg;
const CAMERA_ANIMATION_MS = 600;
/** Markers closer together than this (degrees) can't be split by zooming; open them at street level. */
const CLUSTER_MIN_SPAN = 0.002;
const CLUSTER_STREET_ZOOM = 15;

const round = (value: number) => Math.round(value * 1000) / 1000;
const roundBounds = (ne: GeoJSON.Position, sw: GeoJSON.Position): Bounds => ({
  southWest: [round(sw[0]), round(sw[1])],
  northEast: [round(ne[0]), round(ne[1])],
});

type MapMarker =
  | { kind: 'cluster'; key: string; coordinate: LngLat; routes: Route[] }
  | { kind: 'photo'; key: string; coordinate: LngLat; route: Route }
  | { kind: 'start' | 'finish'; key: string; coordinate: LngLat };

/**
 * 07.01 Haritada Keşfet — Rotalar (Pencil `ygtOL` clusters, `LXKWN` photo pins, `JhMSW` route
 * selected). Routes in the visible area appear as photo pins, merged into "N rota" badges where
 * they would overlap; the sheet lists them with tag chips. Selecting a route draws it in blue
 * with its start and finish, greys out the others and swaps the sheet for its summary.
 */
export default function ExploreMapScreen() {
  const { t } = useTranslation(['explore', 'routes', 'common']);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { showToast } = useToast();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const { position, locate } = useDeviceLocation();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RouteFilter>('all');
  const [area, setArea] = useState<Bounds>(INITIAL_AREA);
  const [zoom, setZoom] = useState(() => initialZoom(screenWidth));
  // The selected route object (not just its id), so it stays if the map moves it out of the list.
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const selectedId = selectedRoute?.id ?? null;
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const [selectedContentHeight, setSelectedContentHeight] = useState(SELECTED_CONTENT_ESTIMATE);
  // Expo Go / web artwork: the points the projection fits (a cluster tap "zooms" into its routes).
  const [fallbackFocus, setFallbackFocus] = useState<LngLat[] | null>(null);
  const [mapSize, setMapSize] = useState({ width: screenWidth, height: screenHeight });

  const { data } = useRoutesInArea(area, filter);
  // Keep the previous list while a new area / filter loads, so markers and cards don't flash.
  const [routes, setRoutes] = useState<Route[] | undefined>(undefined);
  if (data && data !== routes) {
    setRoutes(data);
  }

  const cameraRef = useRef<CameraRef>(null);

  const headerBottom = insets.top + HEADER_HEIGHT;
  const listSheetHeight = SHEET_LIST_HEIGHT + insets.bottom;
  const selectedSheetHeight = HANDLE_HEIGHT + selectedContentHeight + spacing.lg + insets.bottom;
  const snapPoints = useMemo(
    () =>
      selectedRoute
        ? [selectedSheetHeight]
        : [SHEET_COLLAPSED_HEIGHT + insets.bottom, listSheetHeight],
    [insets.bottom, listSheetHeight, selectedRoute, selectedSheetHeight],
  );
  const initialCamera = useMemo(
    () => ({
      bounds: cameraBoundsFor([INITIAL_AREA.southWest, INITIAL_AREA.northEast], {
        top: headerBottom,
        right: 0,
        bottom: listSheetHeight,
        left: 0,
      }),
    }),
    [headerBottom, listSheetHeight],
  );

  // Map buttons ride 16 pt above the sheet; seeded with the open list so they don't jump in.
  const sheetTop = useSharedValue(screenHeight - listSheetHeight);
  const controlsHeight = useSharedValue(0);
  const controlsStyle = useAnimatedStyle(() => {
    const anchor = sheetTop.value - CONTROLS_GAP - controlsHeight.value;
    return { transform: [{ translateY: Math.max(anchor, headerBottom + spacing.lg) }] };
  });

  const cameraPadding = useCallback(
    (bottom: number): MapPadding => ({
      top: headerBottom + spacing.xxl,
      right: spacing.huge + spacing.lg,
      bottom: bottom + spacing.xxl,
      left: spacing.huge,
    }),
    [headerBottom],
  );

  const selectRoute = useCallback(
    (route: Route) => {
      setSelectedRoute(route);
      cameraRef.current?.setCamera({
        bounds: cameraBoundsFor(route.coordinates, cameraPadding(selectedSheetHeight)),
        animationDuration: CAMERA_ANIMATION_MS,
      });
    },
    [cameraPadding, selectedSheetHeight],
  );

  const clearSelection = () => setSelectedRoute(null);

  const openCluster = (members: Route[]) => {
    setSelectedRoute(null);
    const points = members.map(routeMidpoint);
    if (!isNativeMapAvailable) {
      setFallbackFocus(points);
      return;
    }
    const lngs = points.map(([lng]) => lng);
    const lats = points.map(([, lat]) => lat);
    const span = Math.max(
      Math.max(...lngs) - Math.min(...lngs),
      Math.max(...lats) - Math.min(...lats),
    );
    cameraRef.current?.setCamera(
      span < CLUSTER_MIN_SPAN
        ? {
            centerCoordinate: points[0],
            zoomLevel: CLUSTER_STREET_ZOOM,
            animationDuration: CAMERA_ANIMATION_MS,
          }
        : {
            bounds: cameraBoundsFor(points, cameraPadding(listSheetHeight)),
            animationDuration: CAMERA_ANIMATION_MS,
          },
    );
  };

  const handleMapIdle = (state: MapState) => {
    const { bounds, zoom: mapZoom } = state.properties;
    setZoom(Math.round(mapZoom * 4) / 4);
    if (!state.gestures.isGestureActive) {
      setArea(roundBounds(bounds.ne, bounds.sw));
    }
  };

  // Toasts float just above the sheet.
  const toastOffset =
    (selectedRoute ? selectedSheetHeight : listSheetHeight) - insets.bottom + spacing.sm;

  const handleLocate = async () => {
    const coordinate = await locate();
    if (!coordinate) {
      showToast({
        variant: 'failure',
        message: t('map.locationUnavailable'),
        bottomOffset: toastOffset,
      });
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 11,
      animationDuration: CAMERA_ANIMATION_MS,
    });
  };

  // Routes of the area other than the selected one (all of them while nothing is selected).
  const otherRoutes = useMemo(
    () => (routes ?? []).filter((route) => route.id !== selectedId),
    [routes, selectedId],
  );

  const fallbackProject = useMemo(() => {
    const fitPoints = selectedRoute
      ? selectedRoute.coordinates
      : (fallbackFocus ?? (routes ?? []).map(routeMidpoint));
    return createProjection(fitPoints, mapSize.width, mapSize.height, {
      top: headerBottom + ROUTE_PHOTO_PIN_SIZE.height,
      right: spacing.huge + spacing.lg,
      bottom: (selectedRoute ? selectedSheetHeight : listSheetHeight) + spacing.xxl,
      left: spacing.huge,
    });
  }, [
    fallbackFocus,
    headerBottom,
    listSheetHeight,
    mapSize,
    routes,
    selectedRoute,
    selectedSheetHeight,
  ]);

  const markers = useMemo<MapMarker[]>(() => {
    const project = isNativeMapAvailable
      ? (coordinate: LngLat): ScreenPoint => worldPoint(coordinate, zoom)
      : fallbackProject;
    const clusters = clusterMarkers(otherRoutes, {
      id: (route) => route.id,
      coordinate: routeMidpoint,
      project,
      distance: CLUSTER_DISTANCE,
    });
    const result: MapMarker[] = clusters.map((cluster) =>
      // While a route is selected the others are grey count badges, single routes included.
      cluster.members.length === 1 && !selectedRoute
        ? {
            kind: 'photo',
            key: cluster.key,
            coordinate: cluster.coordinate,
            route: cluster.members[0],
          }
        : {
            kind: 'cluster',
            key: cluster.key,
            coordinate: cluster.coordinate,
            routes: cluster.members,
          },
    );
    if (selectedRoute) {
      const { coordinates } = selectedRoute;
      result.push({ kind: 'start', key: 'start', coordinate: coordinates[0] });
      if (!selectedRoute.isLoop) {
        result.push({
          kind: 'finish',
          key: 'finish',
          coordinate: coordinates[coordinates.length - 1],
        });
      }
    }
    return result;
  }, [fallbackProject, otherRoutes, selectedRoute, zoom]);

  const handleClusterPress = (members: Route[]) => {
    if (selectedRoute && members.length === 1) {
      selectRoute(members[0]);
      return;
    }
    openCluster(members);
  };

  const renderMarker = (marker: MapMarker) => {
    switch (marker.kind) {
      case 'cluster':
        return (
          <RouteClusterMarker
            count={marker.routes.length}
            unitLabel={t('map.clusterUnit', { count: marker.routes.length })}
            accessibilityLabel={t('map.clusterLabel', { count: marker.routes.length })}
            tone={selectedRoute ? 'inactive' : 'active'}
            onPress={() => handleClusterPress(marker.routes)}
          />
        );
      case 'photo':
        return (
          <RoutePhotoPin
            image={marker.route.coverImage}
            accessibilityLabel={marker.route.name}
            onPress={() => selectRoute(marker.route)}
          />
        );
      case 'start':
        return <RouteEndpointMarker kind="start" label={t('map.start')} />;
      case 'finish':
        return <RouteEndpointMarker kind="finish" label={t('map.finish')} />;
    }
  };

  const handleMapLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  return (
    <View style={styles.screen} onLayout={handleMapLayout}>
      <BaseMap
        fallbackImage={mapFallbacks.explore}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        onMapIdle={handleMapIdle}
        fallbackOverlay={
          <FallbackLayer
            project={fallbackProject}
            size={mapSize}
            selected={selectedRoute}
            others={otherRoutes}
            markers={markers}
            renderMarker={renderMarker}
          />
        }
        renderLayers={(Mapbox) => (
          <>
            <Mapbox.Camera ref={cameraRef} defaultSettings={initialCamera} />
            {selectedRoute ? (
              <ExploreRouteLines
                mapbox={Mapbox}
                selected={selectedRoute}
                others={otherRoutes}
                onPressRoute={(routeId) => {
                  const route = otherRoutes.find((item) => item.id === routeId);
                  if (route) {
                    selectRoute(route);
                  }
                }}
              />
            ) : null}
            {markers.map((marker) => (
              <Mapbox.MarkerView
                key={marker.key}
                coordinate={marker.coordinate}
                anchor={markerAnchor(marker)}
                allowOverlap
                allowOverlapWithPuck>
                {renderMarker(marker)}
              </Mapbox.MarkerView>
            ))}
            {position ? <Mapbox.LocationPuck puckBearingEnabled={false} /> : null}
          </>
        )}
      />

      <View
        style={[styles.header, { paddingTop: insets.top + spacing.xs }]}
        pointerEvents="box-none">
        <View style={styles.searchRow}>
          <MapActionButton
            icon={NavArrowLeft}
            size="field"
            accessibilityLabel={t('common:actions.back')}
            onPress={goBack}
          />
          <SearchField
            variant="floating"
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            containerStyle={styles.search}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
          contentContainerStyle={styles.categoryTrack}>
          <MapCategoryChip label={t('categories.routes')} icon={PathArrow} selected />
          <MapCategoryChip label={t('categories.fuel')} icon={Gas} selected={false} />
          <MapCategoryChip label={t('categories.repair')} icon={Wrench} selected={false} />
        </ScrollView>
      </View>

      <Animated.View
        style={[styles.controls, controlsStyle]}
        pointerEvents="box-none"
        onLayout={(event) => {
          controlsHeight.set(event.nativeEvent.layout.height);
        }}>
        <MapActionButton
          icon={NavigatorAlt}
          size="fab"
          accessibilityLabel={t('map.myLocation')}
          onPress={handleLocate}
          disabled={!isNativeMapAvailable}
        />
        <MapActionButton
          icon={LayersIcon}
          size="fab"
          accessibilityLabel={t('map.layers')}
          selected={mapStyle === 'satellite'}
          disabled={!isNativeMapAvailable}
          onPress={() =>
            setMapStyle((current) => (current === 'satellite' ? 'default' : 'satellite'))
          }
        />
      </Animated.View>

      <BottomSheet
        // List and selected route have different snap points; a fresh sheet per mode slides in
        // instead of re-indexing one whose snap points are still updating on the UI thread.
        key={selectedRoute ? 'selected' : 'list'}
        snapPoints={snapPoints}
        index={selectedRoute ? 0 : 1}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        animatedPosition={sheetTop}
        style={styles.sheet}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.sheetHandle}
        handleIndicatorStyle={styles.sheetHandleIndicator}>
        {selectedRoute ? (
          <BottomSheetView style={styles.selectedContent}>
            <View
              onLayout={(event) =>
                setSelectedContentHeight(Math.ceil(event.nativeEvent.layout.height))
              }>
              <SelectedRouteSummary
                route={selectedRoute}
                routeCount={routes?.length ?? 0}
                saved={isSaved(selectedRoute.id)}
                onBack={clearSelection}
                onToggleSave={() =>
                  toggleBookmark(selectedRoute.id, { toastBottomOffset: toastOffset })
                }
                onViewRoute={() =>
                  router.push({ pathname: '/route/[id]', params: { id: selectedRoute.id } })
                }
              />
            </View>
          </BottomSheetView>
        ) : (
          <BottomSheetView style={styles.listContent}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {routes === undefined
                  ? ''
                  : routes.length === 0
                    ? t('empty.title')
                    : t('routesInArea', { count: routes.length })}
              </Text>
              {data === undefined ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {FILTERS.map((option) => (
                <FilterChip
                  key={option}
                  type="toggle"
                  showIcon={false}
                  label={
                    option === 'all'
                      ? t('routes:filters.all')
                      : t(`routes:tags.${option as RouteTag}`)
                  }
                  selected={filter === option}
                  onPress={() => setFilter(option)}
                />
              ))}
            </ScrollView>
            {routes && routes.length === 0 ? (
              <Text style={styles.emptyText}>{t('empty.description')}</Text>
            ) : (
              <FlatList
                horizontal
                data={routes ?? []}
                keyExtractor={(route) => route.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cards}
                renderItem={({ item }) => (
                  <RouteCard
                    variant="compact"
                    image={item.coverImage}
                    title={item.name}
                    subtitle={item.summary}
                    distance={formatDistance(item.distanceKm)}
                    duration={formatDuration(item.durationMinutes)}
                    badgeLabel={t(`routes:tags.${item.tag}`)}
                    badgeTone={routeTagBadgeTone[item.tag]}
                    saved={isSaved(item.id)}
                    onToggleSave={() => toggleBookmark(item.id, { toastBottomOffset: toastOffset })}
                    onPress={() => selectRoute(item)}
                  />
                )}
              />
            )}
          </BottomSheetView>
        )}
      </BottomSheet>
    </View>
  );
}

function markerAnchor(marker: MapMarker) {
  switch (marker.kind) {
    case 'cluster':
      return { x: 0.5, y: 0.5 };
    case 'photo':
      return ROUTE_PHOTO_PIN_ANCHOR;
    case 'start':
      return ROUTE_START_MARKER_ANCHOR;
    case 'finish':
      return ROUTE_FINISH_MARKER_ANCHOR;
  }
}

/** Top-left of a marker drawn by hand over the Expo Go artwork, from its anchor point. */
function fallbackMarkerOrigin(marker: MapMarker, point: ScreenPoint): ScreenPoint {
  switch (marker.kind) {
    case 'cluster':
      return { x: point.x - ROUTE_CLUSTER_SIZE / 2, y: point.y - ROUTE_CLUSTER_SIZE / 2 };
    case 'photo':
      return {
        x: point.x - ROUTE_PHOTO_PIN_SIZE.width / 2,
        y: point.y - ROUTE_PHOTO_PIN_SIZE.height,
      };
    case 'start':
      return {
        x: point.x - ROUTE_ENDPOINT_MARKER_WIDTH / 2,
        y: point.y - ROUTE_START_MARKER_OFFSET,
      };
    case 'finish':
      return {
        x: point.x - ROUTE_ENDPOINT_MARKER_WIDTH / 2,
        y: point.y - ROUTE_FINISH_MARKER_OFFSET,
      };
  }
}

type FallbackLayerProps = {
  project: (coordinate: LngLat) => ScreenPoint;
  size: { width: number; height: number };
  selected: Route | null;
  others: readonly Route[];
  markers: MapMarker[];
  renderMarker: (marker: MapMarker) => ReactNode;
};

/** Expo Go / web: the same lines and markers projected onto the design's map artwork. */
function FallbackLayer({
  project,
  size,
  selected,
  others,
  markers,
  renderMarker,
}: FallbackLayerProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {selected ? (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none">
          {others.map((route) => {
            const d = polylinePath(route.coordinates.map(project));
            return (
              <Path
                key={route.id}
                d={d}
                fill="none"
                stroke={colors.surface}
                strokeOpacity={OTHER_LINE.casingOpacity}
                strokeWidth={OTHER_LINE.casing}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {others.map((route) => (
            <Path
              key={`${route.id}-line`}
              d={polylinePath(route.coordinates.map(project))}
              fill="none"
              stroke={colors.routeInactive}
              strokeWidth={OTHER_LINE.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <Path
            d={polylinePath(selected.coordinates.map(project))}
            fill="none"
            stroke={colors.surface}
            strokeWidth={SELECTED_LINE.casing}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={polylinePath(selected.coordinates.map(project))}
            fill="none"
            stroke={colors.brand}
            strokeWidth={SELECTED_LINE.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      {markers.map((marker) => {
        const origin = fallbackMarkerOrigin(marker, project(marker.coordinate));
        return (
          <View
            key={marker.key}
            style={[styles.fallbackMarker, { left: origin.x, top: origin.y }]}
            pointerEvents="box-none">
            {renderMarker(marker)}
          </View>
        );
      })}
    </View>
  );
}

/** Zoom that roughly fits the initial area before the map reports its own. */
function initialZoom(screenWidth: number) {
  const span = INITIAL_AREA.northEast[0] - INITIAL_AREA.southWest[0];
  return Math.log2((screenWidth * 360) / (512 * span));
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/discover');
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
  },
  searchRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  search: {
    flex: 1,
  },
  categoryRow: {
    flexGrow: 0,
    height: 44,
    // Keeps the chip shadows from being clipped by the scroll view.
    overflow: 'visible',
  },
  categoryTrack: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  controls: {
    position: 'absolute',
    top: 0,
    right: layout.screenGutter,
    gap: spacing.md,
  },
  fallbackMarker: {
    position: 'absolute',
  },
  sheet: {
    boxShadow: shadows.bottomPanel,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetBackground: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetHandleIndicator: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  listContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  selectedContent: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
  },
  sheetTitleRow: {
    height: TITLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
  },
  sheetTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  cards: {
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: layout.screenGutter,
  },
});
