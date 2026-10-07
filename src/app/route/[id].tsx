import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkSolid, MapsArrow, NavArrowLeft } from 'iconoir-react-native';
import { useCallback, useMemo, useRef, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { cameraBoundsFor } from '@/components/map/mapGeometry';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { RouteLineLayers } from '@/components/map/RouteLineLayers';
import { DifficultyIcon, RoadIcon } from '@/components/route-detail/icons';
import { RouteAuthorRow } from '@/components/route-detail/RouteAuthorRow';
import { ROUTE_DETAIL_CTA_HEIGHT, RouteDetailCta } from '@/components/route-detail/RouteDetailCta';
import { RouteFactsCard } from '@/components/route-detail/RouteFactsCard';
import { RouteMetricsCard } from '@/components/route-detail/RouteMetricsCard';
import { RoutePhotoStrip } from '@/components/route-detail/RoutePhotoStrip';
import { RouteStopsCard } from '@/components/route-detail/RouteStopsCard';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { useRoute } from '@/features/routes/queries';
import type { Route } from '@/features/routes/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDistance } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';

type CameraRef = ComponentRef<MapboxModule['Camera']>;

/** Sheet heights from the frames (852 pt): "Uzun İçerik" top at 416, "Standart" at 332. */
const SHEET_COLLAPSED_RATIO = (852 - 416) / 852;
const SHEET_DEFAULT_RATIO = (852 - 332) / 852;
const TOP_BAR_HEIGHT = 48;
const MAP_BUTTON_SIZE = 48;
/** "Konumuma git" sits 12 pt above the sheet (01.6 `F9KRGq`). */
const MAP_BUTTON_GAP = 12;
/** The map button fades out over the first 80 pt the sheet is dragged above its default. */
const MAP_BUTTON_FADE_DISTANCE = 80;
const ROUTE_EDGE_PADDING = 32;
/** Toast sits 16 pt above the pinned CTA button. */
const TOAST_BOTTOM_OFFSET = 44 + spacing.lg;

/**
 * 05.04 Rota detayı (Pencil `r1GmqA` / `e2MTEb` "Standart", `dUOP6` "Uzun içerik"): the route on
 * a map behind a draggable sheet with its metrics, stops, photos, details and notes, and a
 * pinned "Rotayı sürmeye başla". Snap points: collapsed, default (Standart), full.
 */
export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('routeDetail');
  const { data: route, isPending } = useRoute(id);
  const insets = useSafeAreaInsets();

  if (isPending) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <TopBar />
        <View style={styles.stateBody}>
          <ActivityIndicator color={colors.textSecondary} accessibilityLabel={t('a11y.loading')} />
        </View>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <TopBar />
        <View style={styles.stateBody}>
          <EmptyState
            title={t('notFound.title')}
            description={t('notFound.description')}
            action={{ label: t('notFound.action'), onPress: goBack }}
          />
        </View>
      </View>
    );
  }

  return <RouteDetail route={route} />;
}

/** Route detail draws the single route in the accent teal (01.6 `Qwd6l` #42EBCC). */
const detailLineColor = () => colors.accentVivid;

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/discover');
  }
}

function TopBar({ route }: { route?: Route }) {
  const { t } = useTranslation();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const saved = route ? isSaved(route.id) : false;

  return (
    <View style={styles.topBar} pointerEvents="box-none">
      <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('actions.back')} onPress={goBack} />
      {route ? (
        <MapActionButton
          icon={saved ? BookmarkSolid : Bookmark}
          accessibilityLabel={t('actions.save')}
          selected={saved}
          onPress={() => toggleBookmark(route.id, { toastBottomOffset: TOAST_BOTTOM_OFFSET })}
        />
      ) : null}
    </View>
  );
}

function RouteDetail({ route }: { route: Route }) {
  const { t } = useTranslation(['routeDetail', 'routes', 'explore']);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { showToast } = useToast();
  const { position, locate } = useDeviceLocation();
  const cameraRef = useRef<CameraRef>(null);
  const detailRoutes = useMemo(() => [route], [route]);

  const collapsedHeight = screenHeight * SHEET_COLLAPSED_RATIO;
  const defaultHeight = screenHeight * SHEET_DEFAULT_RATIO;
  const topReserved = insets.top + TOP_BAR_HEIGHT + spacing.sm;
  const snapPoints = useMemo(
    () => [collapsedHeight, defaultHeight, screenHeight - topReserved],
    [collapsedHeight, defaultHeight, screenHeight, topReserved],
  );
  // The map ends under the sheet's rounded corners at its lowest snap point.
  const mapHeight = screenHeight - collapsedHeight + radius.xl;
  // Initial camera only (`defaultSettings`), so re-renders never pull a panned map back.
  const initialCamera = useMemo(
    () => ({
      bounds: cameraBoundsFor(route.coordinates, {
        top: topReserved + spacing.lg,
        right: ROUTE_EDGE_PADDING,
        bottom: mapHeight - (screenHeight - defaultHeight) + ROUTE_EDGE_PADDING,
        left: ROUTE_EDGE_PADDING,
      }),
    }),
    [defaultHeight, mapHeight, route.coordinates, screenHeight, topReserved],
  );

  // Sheet top, in screen coordinates; the map button rides on it and fades out when expanded.
  const sheetTop = useSharedValue(screenHeight - defaultHeight);
  const defaultTop = screenHeight - defaultHeight;
  const mapButtonStyle = useAnimatedStyle(() => {
    const hidden = sheetTop.value <= defaultTop - MAP_BUTTON_FADE_DISTANCE;
    return {
      opacity: interpolate(sheetTop.value, [defaultTop - MAP_BUTTON_FADE_DISTANCE, defaultTop], [0, 1], Extrapolation.CLAMP),
      // Once faded out it moves off-screen so it can't catch taps meant for the top bar.
      transform: [{ translateY: hidden ? -MAP_BUTTON_SIZE * 2 : sheetTop.value - MAP_BUTTON_SIZE - MAP_BUTTON_GAP }],
    };
  });

  const handleLocate = useCallback(async () => {
    const coordinate = await locate();
    if (!coordinate) {
      showToast({ variant: 'failure', message: t('explore:map.locationUnavailable'), bottomOffset: TOAST_BOTTOM_OFFSET });
      return;
    }
    cameraRef.current?.setCamera({ centerCoordinate: coordinate, zoomLevel: 12, animationDuration: 600 });
  }, [locate, showToast, t]);

  // Riding records a ride, so guests sign in first (Akış A "gerekirse giriş"); then 06.01 Hazırlık.
  const requireAccount = useRequireAccount();
  const startRide = useCallback(
    () =>
      requireAccount('saveRide', () =>
        router.push({ pathname: '/ride/[routeId]/prepare', params: { routeId: route.id } }),
      ),
    [requireAccount, route.id],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <RouteDetailCta label={t('startRide')} onPress={startRide} />
      </BottomSheetFooter>
    ),
    [startRide, t],
  );

  const facts = [
    { key: 'difficulty', icon: DifficultyIcon, label: t('facts.difficulty'), value: t(`routes:difficulty.${route.difficulty}`) },
    { key: 'surface', icon: RoadIcon, label: t('facts.surface'), value: t(`routes:surface.${route.surface}`) },
  ];

  return (
    <View style={styles.screen}>
      <BaseMap
        fallbackImage={mapFallbacks.routeDetail}
        style={[styles.map, { height: mapHeight }]}
        renderLayers={(Mapbox) => (
          <>
            <Mapbox.Camera ref={cameraRef} defaultSettings={initialCamera} />
            <RouteLineLayers mapbox={Mapbox} id="route-detail" routes={detailRoutes} colorFor={detailLineColor} />
            {position ? <Mapbox.LocationPuck puckBearingEnabled={false} /> : null}
          </>
        )}
      />

      <Animated.View style={[styles.mapButton, mapButtonStyle]} pointerEvents="box-none">
        <MapActionButton
          icon={MapsArrow}
          size="controlLarge"
          accessibilityLabel={t('explore:map.locateMe')}
          onPress={handleLocate}
          disabled={!isNativeMapAvailable}
        />
      </Animated.View>

      <View style={[styles.topBarContainer, { paddingTop: insets.top }]} pointerEvents="box-none">
        <TopBar route={route} />
      </View>


      <BottomSheet
        snapPoints={snapPoints}
        index={1}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        animatedPosition={sheetTop}
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBackground}
        handleStyle={styles.sheetHandle}
        handleIndicatorStyle={styles.sheetHandleIndicator}>
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: ROUTE_DETAIL_CTA_HEIGHT + insets.bottom + spacing.xxl },
          ]}>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {route.name}
            </Text>
            <RouteAuthorRow
              author={route.author}
              publishedAt={route.publishedAt}
              onPress={() => router.push({ pathname: '/rider/[id]', params: { id: route.author.id } })}
            />
          </View>

          <RouteMetricsCard route={route} />

          {route.stops && route.stops.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t('sections.stops')}
                </Text>
                <Text style={styles.sectionMeta}>
                  {t('stops.summary', {
                    count: route.stops.filter((stop) => stop.kind === 'stop').length,
                    distance: formatDistance(route.distanceKm),
                  })}
                </Text>
              </View>
              <RouteStopsCard stops={route.stops} />
            </View>
          ) : null}

          {route.photos.length > 0 ? (
            <View style={styles.photos}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('sections.photos')}
              </Text>
              <RoutePhotoStrip photos={route.photos} />
            </View>
          ) : null}

          <View style={styles.facts}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('sections.facts')}
            </Text>
            <RouteFactsCard facts={facts} />
          </View>

          {route.notes ? (
            <View style={styles.notes}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('sections.notes')}
              </Text>
              <Text style={styles.notesBody}>{route.notes}</Text>
            </View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  state: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  stateBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flex: 0,
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
  },
  mapButton: {
    position: 'absolute',
    top: 0,
    right: layout.screenGutter,
  },
  sheetBackground: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    height: 16,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  sheetHandleIndicator: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  sheetContent: {
    gap: spacing.xl,
    paddingTop: spacing.xs,
    paddingHorizontal: layout.screenGutter,
  },
  // 12 pt in the design; the author row's 44 pt touch height adds the rest.
  heading: {
    gap: 10,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  notes: {
    gap: spacing.xs,
  },
  // "Rota ve duraklar": title row 8 pt above the stop card.
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  notesBody: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  photos: {
    gap: spacing.xs,
  },
  facts: {
    gap: 10,
  },
});
