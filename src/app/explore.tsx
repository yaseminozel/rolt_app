import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { router, useFocusEffect } from 'expo-router';
import { NavArrowLeft, NavigatorAlt, PathArrow, Wrench } from 'iconoir-react-native';
import {
  useCallback,
  useEffect,
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
  BackHandler,
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
import { FuelPumpIcon } from '@/components/explore/FuelPumpIcon';
import { LayersIcon } from '@/components/explore/LayersIcon';
import { MapCategoryChip } from '@/components/explore/MapCategoryChip';
import { routeTagBadgeTone } from '@/components/explore/routeTagBadgeTone';
import { SelectedRouteSummary } from '@/components/explore/SelectedRouteSummary';
import {
  SERVICE_PLACE_MARKER_ANCHOR,
  SERVICE_PLACE_MARKER_SIZE,
  ServicePlaceMarker,
} from '@/components/explore/ServicePlaceMarker';
import { ServicePlaceRow } from '@/components/explore/ServicePlaceRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusIcon } from '@/components/feedback/StatusIcon';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { useMapExpand } from '@/components/map/MapExpandTransition';
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
import { haptics } from '@/features/haptics/haptics';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { usePlacesInArea } from '@/features/places/queries';
import type { ServicePlace, ServicePlaceCategory } from '@/features/places/types';
import { distanceKm } from '@/features/routes/geo';
import { useRoutesInArea } from '@/features/routes/queries';
import type { Bounds, LngLat, Route, RouteFilter, RouteTag } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDistance, formatDuration } from '@/i18n/format';
import { openDirections } from '@/lib/openDirections';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';
import {
  EXPLORE_HEADER_HEIGHT,
  EXPLORE_INITIAL_AREA,
  EXPLORE_SHEET_LIST_HEIGHT,
} from '@/features/discover/exploreInitialView';

type CameraRef = ComponentRef<MapboxModule['Camera']>;
type MapViewProps = ComponentProps<MapboxModule['MapView']>;
type MapState = Parameters<NonNullable<MapViewProps['onMapIdle']>>[0];

/** Antalya coast from Kaş to Antalya, where the mock routes are. */
const INITIAL_AREA = EXPLORE_INITIAL_AREA;
/** Sheet chips (07.01 "Rota kategorileri"): "Tümü" and the five tags the design lists. */
const FILTERS: RouteFilter[] = ['all', 'coast', 'curvy', 'scenic', 'city', 'nature'];
/** Markers closer than this on screen merge into one "N rota" badge (the cluster's 72 pt halo). */
const CLUSTER_DISTANCE = ROUTE_CLUSTER_SIZE;

const HEADER_HEIGHT = EXPLORE_HEADER_HEIGHT;
/** Sheet handle area: 8 top + 4 grabber + 12 bottom. */
const HANDLE_HEIGHT = 8 + 4 + 12;
const TITLE_HEIGHT = 36;
const SHEET_COLLAPSED_HEIGHT = HANDLE_HEIGHT + TITLE_HEIGHT + spacing.sm;
// Shared with the Discover map card's static picture (`exploreInitialView`).
const SHEET_LIST_HEIGHT = EXPLORE_SHEET_LIST_HEIGHT;
/** "Benzinlikler" / "Tamirciler" sheet (07.02, 07.03): handle plus a 400 pt scrolling list. */
const SHEET_PLACES_HEIGHT = HANDLE_HEIGHT + 400;
/** "Sonuç yok" sheet (07.04 `B2drm`): 16 top, `EmptyState` (40 icon, 20 title, 2 × 20 text), 16. */
const SHEET_EMPTY_HEIGHT = HANDLE_HEIGHT + 16 + 40 + spacing.md + 20 + spacing.md + 40 + 16;
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

/** What the map shows: routes (07.01) or one kind of service place (07.02, 07.03). */
type ExploreCategory = 'routes' | ServicePlaceCategory;

type MapMarker =
  | { kind: 'cluster'; key: string; coordinate: LngLat; routes: Route[] }
  | { kind: 'place'; key: string; coordinate: LngLat; place: ServicePlace }
  | { kind: 'photo'; key: string; coordinate: LngLat; route: Route }
  | { kind: 'start' | 'finish'; key: string; coordinate: LngLat };

/**
 * 07.01 Haritada Keşfet — Rotalar (Pencil `ygtOL` clusters, `LXKWN` photo pins, `JhMSW` route
 * selected). Routes in the visible area appear as photo pins, merged into "N rota" badges where
 * they would overlap; the sheet lists them with tag chips. Selecting a route draws it in blue
 * with its start and finish, greys out the others and swaps the sheet for its summary.
 * The Benzinlik / Tamirci chips (07.02 `I3V8M`, 07.03 `sXCGN`) swap routes for fuel stations or
 * repair shops in the area: pins on the map and a list with rating, distance, opening state and
 * "Yol tarifi".
 */
export default function ExploreMapScreen() {
  const { t } = useTranslation(['explore', 'routes', 'common']);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { showToast } = useToast();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const { position, locate } = useDeviceLocation();
  const { collapse, markTargetReady, targetRevealed } = useMapExpand();

  const [query, setQuery] = useState('');
  // "Bu bölgede ara" narrows the selected layer once submitted (typing alone changes nothing).
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<ExploreCategory>('routes');
  const placeCategory = category === 'routes' ? null : category;
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

  const routesQuery = useRoutesInArea(area, filter, searchQuery);
  const { data } = routesQuery;
  // Keep the previous list while a new area / filter loads, so markers and cards don't flash.
  const [routes, setRoutes] = useState<Route[] | undefined>(undefined);
  if (data && data !== routes) {
    setRoutes(data);
  }

  const placesQuery = usePlacesInArea(area, placeCategory, searchQuery);
  const places = placeCategory ? placesQuery.data : undefined;

  // 07.04 "Aranıyor…" while a search runs, "Sonuç yok" once it finds nothing in the area.
  const searching =
    searchQuery !== '' && (placeCategory ? placesQuery.isFetching : routesQuery.isFetching);
  const noResults =
    searchQuery !== '' &&
    !searching &&
    (placeCategory
      ? placesQuery.data?.length === 0 && !placesQuery.isPlaceholderData
      : data?.length === 0);

  const cameraRef = useRef<CameraRef>(null);

  const headerBottom = insets.top + HEADER_HEIGHT;
  const listSheetHeight = SHEET_LIST_HEIGHT + insets.bottom;
  const placesSheetHeight = SHEET_PLACES_HEIGHT + insets.bottom;
  const selectedSheetHeight = HANDLE_HEIGHT + selectedContentHeight + spacing.lg + insets.bottom;
  const emptySheetHeight = SHEET_EMPTY_HEIGHT + insets.bottom;
  const openSheetHeight = selectedRoute
    ? selectedSheetHeight
    : noResults
      ? emptySheetHeight
      : placeCategory
        ? placesSheetHeight
        : listSheetHeight;
  // The selected route and "Sonuç yok" sheets have one height; the lists also collapse to a title.
  const singleSnap = selectedRoute !== null || noResults;
  const snapPoints = useMemo(
    () =>
      singleSnap ? [openSheetHeight] : [SHEET_COLLAPSED_HEIGHT + insets.bottom, openSheetHeight],
    [insets.bottom, openSheetHeight, singleSnap],
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
      haptics.select();
      setSelectedRoute(route);
      cameraRef.current?.setCamera({
        bounds: cameraBoundsFor(route.coordinates, cameraPadding(selectedSheetHeight)),
        animationDuration: CAMERA_ANIMATION_MS,
      });
    },
    [cameraPadding, selectedSheetHeight],
  );

  const clearSelection = () => setSelectedRoute(null);

  const changeCategory = (next: ExploreCategory) => {
    setSelectedRoute(null);
    setCategory(next);
  };

  const focusPlace = (place: ServicePlace) => {
    haptics.select();
    cameraRef.current?.setCamera({
      centerCoordinate: place.coordinates,
      zoomLevel: CLUSTER_STREET_ZOOM,
      padding: { paddingTop: 0, paddingLeft: 0, paddingRight: 0, paddingBottom: placesSheetHeight },
      animationDuration: CAMERA_ANIMATION_MS,
    });
  };

  // "N km": from the rider when the location is known, otherwise from the map centre.
  const origin: LngLat = position ?? [
    (area.southWest[0] + area.northEast[0]) / 2,
    (area.southWest[1] + area.northEast[1]) / 2,
  ];
  const sortedPlaces = useMemo(
    () =>
      places
        ?.map((place) => ({ place, distance: distanceKm(origin, place.coordinates) }))
        .sort((a, b) => a.distance - b.distance),
    // `origin` is rebuilt every render; its parts are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, origin[0], origin[1]],
  );

  const openCluster = (members: Route[]) => {
    haptics.tap();
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

  // The card's clone fades once there's a map under it: the artwork at once, Mapbox when drawn.
  useEffect(() => {
    if (!isNativeMapAvailable) {
      markTargetReady();
    }
  }, [markTargetReady]);

  // Back shrinks the map into Discover's card it grew from (or just goes back).
  const goBack = useCallback(() => {
    if (!router.canGoBack()) {
      router.replace('/discover');
    } else if (!collapse(() => router.back())) {
      router.back();
    }
  }, [collapse]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );

  const handleMapIdle = (state: MapState) => {
    markTargetReady();
    const { bounds, zoom: mapZoom } = state.properties;
    setZoom(Math.round(mapZoom * 4) / 4);
    if (!state.gestures.isGestureActive) {
      setArea(roundBounds(bounds.ne, bounds.sw));
    }
  };

  // Toasts float just above the sheet.
  const toastOffset = openSheetHeight - insets.bottom + spacing.sm;

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
    () => (placeCategory ? [] : (routes ?? []).filter((route) => route.id !== selectedId)),
    [placeCategory, routes, selectedId],
  );

  const fallbackProject = useMemo(() => {
    const fitPoints = selectedRoute
      ? selectedRoute.coordinates
      : placeCategory
        ? (places ?? []).map((place) => place.coordinates)
        : (fallbackFocus ?? (routes ?? []).map(routeMidpoint));
    return createProjection(fitPoints, mapSize.width, mapSize.height, {
      top: headerBottom + ROUTE_PHOTO_PIN_SIZE.height,
      right: spacing.huge + spacing.lg,
      bottom: openSheetHeight + spacing.xxl,
      left: spacing.huge,
    });
  }, [
    fallbackFocus,
    headerBottom,
    mapSize,
    openSheetHeight,
    placeCategory,
    places,
    routes,
    selectedRoute,
  ]);

  const markers = useMemo<MapMarker[]>(() => {
    if (placeCategory) {
      return (places ?? []).map((place) => ({
        kind: 'place',
        key: place.id,
        coordinate: place.coordinates,
        place,
      }));
    }
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
  }, [fallbackProject, otherRoutes, placeCategory, places, selectedRoute, zoom]);

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
      case 'place':
        return (
          <ServicePlaceMarker
            category={marker.place.category}
            accessibilityLabel={marker.place.name}
            onPress={isNativeMapAvailable ? () => focusPlace(marker.place) : undefined}
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
            onChangeText={(text) => {
              setQuery(text);
              if (text.trim() === '') {
                setSearchQuery('');
              }
            }}
            onSubmitEditing={() => {
              setSelectedRoute(null);
              setSearchQuery(query.trim());
            }}
            onClear={() => {
              setQuery('');
              setSearchQuery('');
            }}
            placeholder={t('search.placeholder')}
            containerStyle={styles.search}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
          contentContainerStyle={styles.categoryTrack}>
          <MapCategoryChip
            label={t('categories.routes')}
            icon={PathArrow}
            selected={category === 'routes'}
            onPress={() => changeCategory('routes')}
          />
          <MapCategoryChip
            label={t('categories.fuel')}
            icon={FuelPumpIcon}
            selected={category === 'fuel'}
            onPress={() => changeCategory('fuel')}
          />
          <MapCategoryChip
            label={t('categories.repair')}
            icon={Wrench}
            selected={category === 'repair'}
            onPress={() => changeCategory('repair')}
          />
        </ScrollView>
      </View>

      {searching ? (
        <View
          style={[styles.searchingRow, { top: headerBottom + spacing.sm }]}
          pointerEvents="none">
          <View style={styles.searchingPill} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.searchingLabel}>{t('search.searching')}</Text>
          </View>
        </View>
      ) : null}

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

      {/* Comes in (slides up) as the card's clone fades, not unseen beneath it. */}
      {targetRevealed ? (
        <BottomSheet
          // List and selected route have different snap points; a fresh sheet per mode slides in
          // instead of re-indexing one whose snap points are still updating on the UI thread.
          key={selectedRoute ? 'selected' : noResults ? 'empty' : category}
          snapPoints={snapPoints}
          index={singleSnap ? 0 : 1}
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
          ) : noResults ? (
            <BottomSheetView style={styles.emptyContent}>
              <EmptyState
                icon={<StatusIcon status="neutral" />}
                title={t('search.noResults.title')}
                description={t('search.noResults.description')}
              />
            </BottomSheetView>
          ) : placeCategory ? (
            <BottomSheetView style={styles.placesContent}>
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle} accessibilityRole="header">
                  {t(`places.title.${placeCategory}`)}
                </Text>
                {placesQuery.isFetching ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : null}
              </View>
              {placesQuery.isError && !places ? (
                <Text style={styles.placesMessage}>{t('places.error')}</Text>
              ) : sortedPlaces && sortedPlaces.length === 0 ? (
                <Text style={styles.placesMessage}>{t(`places.empty.${placeCategory}`)}</Text>
              ) : (
                <BottomSheetFlatList
                  data={sortedPlaces ?? []}
                  keyExtractor={(item) => item.place.id}
                  contentContainerStyle={styles.placesList}
                  renderItem={({ item, index }) => (
                    <ServicePlaceRow
                      place={item.place}
                      distanceKm={item.distance}
                      last={index === (sortedPlaces?.length ?? 0) - 1}
                      onPress={() => focusPlace(item.place)}
                      onDirections={() => openDirections(item.place.coordinates, item.place.name)}
                    />
                  )}
                />
              )}
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
                      onToggleSave={() =>
                        toggleBookmark(item.id, { toastBottomOffset: toastOffset })
                      }
                      onPress={() => selectRoute(item)}
                    />
                  )}
                />
              )}
            </BottomSheetView>
          )}
        </BottomSheet>
      ) : null}
    </View>
  );
}

function markerAnchor(marker: MapMarker) {
  switch (marker.kind) {
    case 'cluster':
      return { x: 0.5, y: 0.5 };
    case 'place':
      return SERVICE_PLACE_MARKER_ANCHOR;
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
    case 'place':
      return {
        x: point.x - SERVICE_PLACE_MARKER_SIZE.width / 2,
        y: point.y - SERVICE_PLACE_MARKER_SIZE.height,
      };
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
  searchingRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapFab,
  },
  searchingLabel: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  emptyContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
  },
  placesContent: {
    flex: 1,
    gap: spacing.sm,
  },
  placesList: {
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
  },
  placesMessage: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: layout.screenGutter,
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
