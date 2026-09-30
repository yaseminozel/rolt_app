import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { MapsArrow, NavArrowLeft } from 'iconoir-react-native';
import { useCallback, useMemo, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayersIcon } from '@/components/explore/LayersIcon';
import { RoutePreviewCard } from '@/components/explore/RoutePreviewCard';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { cameraBoundsFor, metersPerPoint, routeMidpoint, type MapPadding } from '@/components/map/mapGeometry';
import { MapScaleBar } from '@/components/map/MapScaleBar';
import type { MapStyle } from '@/components/map/mapStyles';
import { MapZoomControl } from '@/components/map/MapZoomControl';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { RouteLineLayers } from '@/components/map/RouteLineLayers';
import { ROUTE_PHOTO_PIN_ANCHOR, RoutePhotoPin } from '@/components/map/RoutePhotoPin';
import { routeTagTones } from '@/components/map/routeTagTones';
import { RouteCard } from '@/components/route/RouteCard';
import { FilterChip } from '@/components/ui/FilterChip';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { findCityByName } from '@/features/location/turkishCities';
import { distanceKm } from '@/features/routes/geo';
import { useRoutesInArea } from '@/features/routes/queries';
import type { Bounds, LngLat, Route, RouteFilter, RouteTag } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

type CameraRef = ComponentRef<MapboxModule['Camera']>;
type MapViewProps = ComponentProps<MapboxModule['MapView']>;
type MapState = Parameters<NonNullable<MapViewProps['onMapIdle']>>[0];

/** Antalya coast from Kaş to Antalya, the area drawn in the design (01.7 `eMAqs`). */
const INITIAL_AREA: Bounds = { southWest: [29.35, 36.15], northEast: [30.95, 37.12] };
/** Chip order of the design ("Tümü", then the route tags; Off-road joined the vocabulary later). */
const FILTERS: RouteFilter[] = ['all', 'coast', 'curvy', 'scenic', 'city', 'nature', 'offRoad'];
/** The Expo Go artwork's own scale: 140 pt = 20 km (01.7 `rxpI9`). */
const FALLBACK_METERS_PER_POINT = 20000 / 140;

const TOP_BAR_HEIGHT = 48;
const CARD_INSET = 12;
/** Design card height, used before the card has been measured. */
const PREVIEW_CARD_ESTIMATE = 227;
/** Sheet (01.7 `uwUKg`): 8 top padding + 16 handle + 4 gap, then the content. */
const SHEET_HEADER_HEIGHT = 8 + 16 + 4 + 36;
const SHEET_CONTENT_HEIGHT = SHEET_HEADER_HEIGHT + 16 + 34 + 16 + 191 + 16;
/** Scale bar sits 8 pt above the sheet; zoom sits 16 pt above the preview card. */
const CONTROLS_GAP_SHEET = spacing.sm;
const CONTROLS_GAP_CARD = spacing.lg;
const CAMERA_ANIMATION_MS = 600;

const round = (value: number) => Math.round(value * 1000) / 1000;
const roundBounds = (ne: GeoJSON.Position, sw: GeoJSON.Position): Bounds => ({
  southWest: [round(sw[0]), round(sw[1])],
  northEast: [round(ne[0]), round(ne[1])],
});

/** Distance to the nearest vertex of the route. */
const distanceToRoute = (from: LngLat, route: Route) =>
  Math.min(...route.coordinates.map((point) => distanceKm(from, point)));

/**
 * 01.7 Haritada Keşfet (Pencil `Y0OQR` "Rota listesi", `lBW4t` "Rota seçili"): routes in the
 * visible area as coloured lines with numbered photo markers, a persistent list sheet with tag
 * filters, and a preview card while a route is selected. Optional `city` param: the city chosen
 * on Discover, used for "N km uzakta" when the rider's location is unknown.
 */
export default function ExploreMapScreen() {
  const { t } = useTranslation(['explore', 'routes', 'common']);
  const { city } = useLocalSearchParams<{ city?: string }>();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { showToast } = useToast();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const { position, locate } = useDeviceLocation();

  const [filter, setFilter] = useState<RouteFilter>('all');
  const [area, setArea] = useState<Bounds>(INITIAL_AREA);
  // The selected route object (not just its id), so the card stays if the map moves it out of the list.
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const selectedId = selectedRoute?.id ?? null;
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const [scale, setScale] = useState(isNativeMapAvailable ? 0 : FALLBACK_METERS_PER_POINT);
  const [cardHeight, setCardHeight] = useState(PREVIEW_CARD_ESTIMATE);

  const { data } = useRoutesInArea(area, filter);
  // Keep the previous list while a new area / filter loads, so markers and cards don't flash.
  const [routes, setRoutes] = useState<Route[] | undefined>(undefined);
  if (data && data !== routes) {
    setRoutes(data);
  }

  // A selected route that left the visible area keeps its line on the map.
  const drawnRoutes =
    selectedRoute && routes && !routes.some((route) => route.id === selectedRoute.id)
      ? [...routes, selectedRoute]
      : routes;

  const cameraRef = useRef<CameraRef>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const zoomRef = useRef<number | null>(null);

  const sheetFullHeight = SHEET_CONTENT_HEIGHT + insets.bottom;
  const snapPoints = useMemo(
    () => [SHEET_HEADER_HEIGHT + spacing.sm + insets.bottom, sheetFullHeight],
    [insets.bottom, sheetFullHeight],
  );
  const topReserved = insets.top + TOP_BAR_HEIGHT;
  const initialCamera = useMemo(
    () => ({
      bounds: cameraBoundsFor([INITIAL_AREA.southWest, INITIAL_AREA.northEast], {
        top: topReserved,
        right: 0,
        bottom: sheetFullHeight,
        left: 0,
      }),
    }),
    [sheetFullHeight, topReserved],
  );
  const cardBottom = insets.bottom + spacing.sm;

  // Map controls ride on top of the sheet, or of the preview card while a route is selected.
  // Seeded with the layout before the first measurement so the controls don't jump in.
  const sheetTop = useSharedValue(screenHeight - sheetFullHeight);
  const cardTop = useSharedValue(screenHeight - cardBottom - PREVIEW_CARD_ESTIMATE);
  const controlsHeight = useSharedValue(0);
  const cardVisible = useSharedValue(false);
  const controlsStyle = useAnimatedStyle(() => {
    const anchor = cardVisible.value ? cardTop.value - CONTROLS_GAP_CARD : sheetTop.value - CONTROLS_GAP_SHEET;
    return { transform: [{ translateY: Math.max(anchor - controlsHeight.value, topReserved + spacing.lg) }] };
  });

  const fitRoute = useCallback(
    (route: Route) => {
      const padding: MapPadding = {
        top: topReserved + spacing.xxl,
        right: 72,
        bottom: cardHeight + cardBottom + spacing.xxl,
        left: spacing.xxxl,
      };
      cameraRef.current?.setCamera({
        bounds: cameraBoundsFor(route.coordinates, padding),
        animationDuration: CAMERA_ANIMATION_MS,
      });
    },
    [cardBottom, cardHeight, topReserved],
  );

  const selectRoute = useCallback(
    (routeId: string) => {
      const route = routes?.find((item) => item.id === routeId);
      if (!route) {
        return;
      }
      setSelectedRoute(route);
      cardVisible.set(true);
      sheetRef.current?.close();
      fitRoute(route);
    },
    [cardVisible, fitRoute, routes],
  );

  const clearSelection = () => {
    setSelectedRoute(null);
    cardVisible.set(false);
    sheetRef.current?.snapToIndex(1);
  };

  const handleCardLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    cardTop.set(y);
    setCardHeight(height);
  };

  const handleMapIdle = (state: MapState) => {
    const { bounds, zoom, center } = state.properties;
    zoomRef.current = zoom;
    setScale(metersPerPoint(zoom, center[1]));
    if (!state.gestures.isGestureActive) {
      setArea(roundBounds(bounds.ne, bounds.sw));
    }
  };

  const zoomBy = (delta: number) => {
    if (zoomRef.current === null) {
      return;
    }
    cameraRef.current?.zoomTo(zoomRef.current + delta, 300);
  };

  // Toasts clear the preview card, or float just above the list sheet.
  const toastOffset = selectedRoute ? cardHeight + spacing.lg : sheetFullHeight - insets.bottom + spacing.sm;

  const handleLocate = async () => {
    const coordinate = await locate();
    if (!coordinate) {
      showToast({ variant: 'failure', message: t('map.locationUnavailable'), bottomOffset: toastOffset });
      return;
    }
    cameraRef.current?.setCamera({ centerCoordinate: coordinate, zoomLevel: 11, animationDuration: CAMERA_ANIMATION_MS });
  };

  const origin = position ?? cityCentre(city ?? selectedRoute?.city);
  const startRide = (routeId: string) => router.navigate({ pathname: '/record', params: { routeId } });

  return (
    <View style={styles.screen}>
      <BaseMap
        fallbackImage={mapFallbacks.explore}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        onMapIdle={handleMapIdle}
        onCameraChanged={(state) => {
          zoomRef.current = state.properties.zoom;
        }}
        renderLayers={(Mapbox) => (
          <>
            <Mapbox.Camera ref={cameraRef} defaultSettings={initialCamera} />
            {drawnRoutes ? (
              <RouteLineLayers
                mapbox={Mapbox}
                id="explore"
                routes={drawnRoutes}
                colorFor={routeTagColor}
                selectedRouteId={selectedId}
                onPressRoute={selectRoute}
              />
            ) : null}
            {routes?.map((route, index) => (
              <Mapbox.MarkerView
                key={route.id}
                coordinate={routeMidpoint(route)}
                anchor={ROUTE_PHOTO_PIN_ANCHOR}
                allowOverlap
                isSelected={route.id === selectedId}>
                <RoutePhotoPin
                  image={route.coverImage}
                  number={index + 1}
                  accessibilityLabel={t('map.routeMarker', { number: index + 1, name: route.name })}
                  onPress={() => selectRoute(route.id)}
                  dimmed={selectedId !== null && route.id !== selectedId}
                />
              </Mapbox.MarkerView>
            ))}
            {position ? <Mapbox.LocationPuck puckBearingEnabled={false} /> : null}
          </>
        )}
      />

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('common:actions.back')} onPress={goBack} />
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {t('title')}
        </Text>
        <MapActionButton
          icon={LayersIcon}
          accessibilityLabel={t('map.satellite')}
          selected={mapStyle === 'satellite'}
          disabled={!isNativeMapAvailable}
          onPress={() => setMapStyle((current) => (current === 'satellite' ? 'default' : 'satellite'))}
        />
      </View>

      <Animated.View
        style={[styles.controls, controlsStyle]}
        pointerEvents="box-none"
        onLayout={(event) => {
          controlsHeight.set(event.nativeEvent.layout.height);
        }}>
        <MapActionButton
          icon={MapsArrow}
          size="control"
          accessibilityLabel={t('map.locateMe')}
          onPress={handleLocate}
          disabled={!isNativeMapAvailable}
        />
        <MapZoomControl
          zoomInLabel={t('map.zoomIn')}
          zoomOutLabel={t('map.zoomOut')}
          onZoomIn={() => zoomBy(1)}
          onZoomOut={() => zoomBy(-1)}
          disabled={!isNativeMapAvailable}
        />
        {selectedRoute ? null : <MapScaleBar metersPerPoint={scale} style={styles.scale} />}
      </Animated.View>

      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={1}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        animatedPosition={sheetTop}
        style={styles.sheet}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.sheetHandle}
        handleIndicatorStyle={styles.sheetHandleIndicator}>
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {routes === undefined ? '' : routes.length === 0 ? t('empty.title') : t('routesInArea', { count: routes.length })}
            </Text>
            {data === undefined ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((option) => (
              <FilterChip
                key={option}
                type="toggle"
                showIcon={false}
                label={option === 'all' ? t('routes:filters.all') : t(`routes:tags.${option as RouteTag}`)}
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
                  saved={isSaved(item.id)}
                  onToggleSave={() => toggleBookmark(item.id, { toastBottomOffset: toastOffset })}
                  onPress={() => selectRoute(item.id)}
                />
              )}
            />
          )}
        </BottomSheetView>
      </BottomSheet>

      {selectedRoute ? (
        <RoutePreviewCard
          route={selectedRoute}
          distanceAwayKm={origin ? distanceToRoute(origin, selectedRoute) : null}
          saved={isSaved(selectedRoute.id)}
          onToggleSave={() => toggleBookmark(selectedRoute.id, { toastBottomOffset: toastOffset })}
          onClose={clearSelection}
          onViewDetails={() => router.push({ pathname: '/route/[id]', params: { id: selectedRoute.id } })}
          onStartRide={() => startRide(selectedRoute.id)}
          onLayout={handleCardLayout}
          style={[styles.previewCard, { bottom: cardBottom }]}
        />
      ) : null}
    </View>
  );
}

const routeTagColor = (route: Route) => routeTagTones[route.tag].ink;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/discover');
  }
}

function cityCentre(name: string | undefined): LngLat | null {
  const city = findCityByName(name);
  return city ? [city.longitude, city.latitude] : null;
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
  controls: {
    position: 'absolute',
    top: 0,
    right: layout.screenGutter,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  scale: {
    marginTop: spacing.sm,
  },
  sheet: {
    boxShadow: shadows.mapSheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetBackground: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sheetHandleIndicator: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  sheetContent: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  sheetTitleRow: {
    height: 36,
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
  previewCard: {
    position: 'absolute',
    left: CARD_INSET,
    right: CARD_INSET,
  },
});
