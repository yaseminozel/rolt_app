import { router, useLocalSearchParams } from 'expo-router';
import { Drag, InfoCircle, MapPin, MapsArrow, NavArrowLeft } from 'iconoir-react-native';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayersIcon } from '@/components/explore/LayersIcon';
import { useToast } from '@/components/feedback/ToastProvider';
import { BaseMap, isNativeMapAvailable, mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import type { MapStyle } from '@/components/map/mapStyles';
import { MapZoomControl } from '@/components/map/MapZoomControl';
import type { MapboxModule } from '@/components/map/NativeBaseMap';
import { MAP_CENTER_PIN_TIP, MapCenterPin } from '@/components/route-builder/MapCenterPin';
import { MapPill } from '@/components/route-builder/MapPill';
import { Button } from '@/components/ui/Button';
import { DEFAULT_DISCOVER_CITY } from '@/features/discover/DiscoverStateProvider';
import { findCityByName } from '@/features/location/turkishCities';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { formatCoordinates, placeShortLabel } from '@/features/route-suggestion/placeFormat';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { placeSearch } from '@/features/route-suggestion/services';
import type { Place, WaypointKind } from '@/features/route-suggestion/types';
import { useDiscardEmptyStop } from '@/features/route-suggestion/useDiscardEmptyStop';
import type { LngLat } from '@/features/routes/types';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

type CameraRef = ComponentRef<MapboxModule['Camera']>;
type MapViewProps = ComponentProps<MapboxModule['MapView']>;
type MapState = Parameters<NonNullable<MapViewProps['onMapIdle']>>[0];

const TOP_BAR_HEIGHT = 48;
const CARD_INSET = 12;
/** Design card height (`ocX7E`) before it is measured. */
const CARD_ESTIMATE = 146;
const CONTROLS_GAP = spacing.lg;
/** Gap between the hint pill and the pin head (design: 19 pt). */
const HINT_GAP = 19;
const HINT_HEIGHT = 29;
const INITIAL_ZOOM = 15;
const REVERSE_DELAY_MS = 400;
const CAMERA_ANIMATION_MS = 600;
const TOAST_OFFSET = CARD_ESTIMATE + spacing.lg;

/** Coordinates rounded to ~1 m so tiny camera jitters don't trigger new lookups. */
const roundPoint = ([lng, lat]: LngLat): LngLat => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
const samePoint = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1];

/**
 * 04.1 "Haritadan seç" (`t7X6H`): full-screen map under a fixed centre pin with the waypoint's
 * badge. The point under the pin is read when the map settles and reverse-geocoded into the card;
 * "Bu noktayı başlangıç yap" sets the waypoint. The camera padding keeps Mapbox's centre on the
 * pin tip, above the card. In Expo Go / web the design artwork is shown and the point is the
 * waypoint's place, the rider's position or the default region centre ("Konumuma git" moves it).
 */
export default function PickOnMapScreen() {
  const { t } = useTranslation(['routeSuggestion', 'common']);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { showToast } = useToast();
  const { waypointId } = useLocalSearchParams<{ waypointId: string }>();
  const { draft, setWaypointPlace } = useRouteSuggestion();
  const { position, locate } = useDeviceLocation();
  const waypoint = draft.waypoints.find((item) => item.id === waypointId) ?? null;
  const { handOff, isLeaving } = useDiscardEmptyStop(waypoint);

  const [initialPoint] = useState<LngLat>(() => waypoint?.place?.coordinates ?? position ?? defaultCentre());
  // Native: the centre reported when the map settles. Expo Go: the waypoint's place or "Konumuma git".
  const [idlePoint, setIdlePoint] = useState<LngLat | null>(null);
  const [manualPoint, setManualPoint] = useState<LngLat | null>(waypoint?.place?.coordinates ?? null);
  const [pointLng, pointLat] = roundPoint(
    isNativeMapAvailable ? (idlePoint ?? initialPoint) : (manualPoint ?? position ?? initialPoint),
  );
  const point = useMemo<LngLat>(() => [pointLng, pointLat], [pointLng, pointLat]);
  const [address, setAddress] = useState<Place | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const [cardTop, setCardTop] = useState(height - insets.bottom - spacing.sm - CARD_ESTIMATE);
  const cameraRef = useRef<CameraRef>(null);
  const zoomRef = useRef(INITIAL_ZOOM);
  const movedByRider = useRef(Boolean(waypoint?.place));

  useEffect(() => {
    if (!waypoint && !isLeaving()) {
      router.back();
    }
  }, [isLeaving, waypoint]);

  // The rider's position arrives after the first render: start there unless the map was moved.
  useEffect(() => {
    if (!position || movedByRider.current || !isNativeMapAvailable) {
      return;
    }
    movedByRider.current = true;
    cameraRef.current?.setCamera({ centerCoordinate: position, animationDuration: CAMERA_ANIMATION_MS });
  }, [position]);

  // Address of the point under the pin, once the map has settled.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      placeSearch
        .reverse(point)
        .then((place) => !cancelled && setAddress({ ...place, coordinates: point }))
        .catch(() => undefined);
    }, REVERSE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [point]);

  const bottomReserved = height - cardTop;
  const pinCentreY = insets.top + (height - insets.top - bottomReserved) / 2;
  const cameraPadding = useMemo(
    () => ({ paddingTop: insets.top, paddingBottom: bottomReserved, paddingLeft: 0, paddingRight: 0 }),
    [bottomReserved, insets.top],
  );

  if (!waypoint) {
    return <View style={styles.screen} />;
  }

  const handleMapIdle = (state: MapState) => {
    zoomRef.current = state.properties.zoom;
    setIdlePoint(roundPoint(state.properties.center as LngLat));
  };

  const handleLocate = async () => {
    const coordinates = await locate();
    if (!coordinates) {
      showToast({ variant: 'failure', message: t('search.locationUnavailable'), bottomOffset: TOAST_OFFSET });
      return;
    }
    movedByRider.current = true;
    if (isNativeMapAvailable) {
      cameraRef.current?.setCamera({ centerCoordinate: coordinates, animationDuration: CAMERA_ANIMATION_MS });
    } else {
      setManualPoint(coordinates);
    }
  };

  const zoomBy = (delta: number) => cameraRef.current?.zoomTo(zoomRef.current + delta, 300);

  const resolved = address && samePoint(address.coordinates, point) ? address : null;
  const tone = pinDiscTone(waypoint.kind);

  const confirm = () => {
    handOff();
    setWaypointPlace(waypoint.id, resolved ?? { id: `point-${point[0]},${point[1]}`, name: t('pickOnMap.droppedPin'), coordinates: point });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <BaseMap
        fallbackImage={mapFallbacks.explore}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        onMapIdle={handleMapIdle}
        onCameraChanged={(state) => {
          zoomRef.current = state.properties.zoom;
          if (state.gestures.isGestureActive) {
            movedByRider.current = true;
          }
        }}
        renderLayers={(Mapbox) => (
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{ centerCoordinate: initialPoint, zoomLevel: INITIAL_ZOOM }}
            padding={cameraPadding}
          />
        )}
      />

      <View style={[styles.hintRow, { top: pinCentreY - MAP_CENTER_PIN_TIP.y - HINT_GAP - HINT_HEIGHT }]} pointerEvents="none">
        {isNativeMapAvailable ? (
          <MapPill label={t('pickOnMap.hint')} tone="inverse" icon={Drag} />
        ) : (
          <MapPill label={t('pickOnMap.fallbackHint')} tone="inverse" icon={InfoCircle} numberOfLines={2} />
        )}
      </View>
      <MapCenterPin
        kind={waypoint.kind}
        style={[styles.pin, { left: width / 2 - MAP_CENTER_PIN_TIP.x, top: pinCentreY - MAP_CENTER_PIN_TIP.y }]}
      />

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('common:actions.back')} onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {t(`search.title_${waypoint.kind}`)}
        </Text>
        <MapActionButton
          icon={LayersIcon}
          accessibilityLabel={t('map.satellite')}
          selected={mapStyle === 'satellite'}
          disabled={!isNativeMapAvailable}
          onPress={() => setMapStyle((current) => (current === 'satellite' ? 'default' : 'satellite'))}
        />
      </View>

      <View style={[styles.controls, { bottom: bottomReserved + CONTROLS_GAP }]} pointerEvents="box-none">
        <MapActionButton icon={MapsArrow} size="control" accessibilityLabel={t('map.locateMe')} onPress={handleLocate} />
        <MapZoomControl
          zoomInLabel={t('map.zoomIn')}
          zoomOutLabel={t('map.zoomOut')}
          onZoomIn={() => zoomBy(1)}
          onZoomOut={() => zoomBy(-1)}
          disabled={!isNativeMapAvailable}
        />
      </View>

      <View
        style={[styles.card, { bottom: insets.bottom + spacing.sm }]}
        onLayout={(event: LayoutChangeEvent) => setCardTop(event.nativeEvent.layout.y)}>
        <View style={styles.address} accessible accessibilityLiveRegion="polite">
          <View style={[styles.addressIcon, { backgroundColor: tone.disc }]}>
            <MapPin width={18} height={18} color={tone.icon} strokeWidth={1.8} />
          </View>
          <View style={styles.addressText}>
            <Text style={[styles.addressName, !resolved && styles.addressPending]} numberOfLines={2}>
              {resolved ? placeShortLabel(resolved) : t('pickOnMap.locating')}
            </Text>
            <Text style={styles.coordinates}>{formatCoordinates(point)}</Text>
          </View>
        </View>
        <Button label={t(`pickOnMap.confirm_${waypoint.kind}`)} size="lg" onPress={confirm} />
      </View>
    </View>
  );
}

function defaultCentre(): LngLat {
  const city = findCityByName(DEFAULT_DISCOVER_CITY);
  return city ? [city.longitude, city.latitude] : [30.7133, 36.8969];
}

/** Address icon follows the waypoint: green start, dark end, neutral stop. */
function pinDiscTone(kind: WaypointKind) {
  if (kind === 'start') {
    return { disc: colors.successSurface, icon: colors.success };
  }
  return { disc: colors.surfaceMuted, icon: kind === 'end' ? colors.textPrimary : colors.textBody };
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
  hintRow: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    alignItems: 'center',
  },
  pin: {
    position: 'absolute',
  },
  controls: {
    position: 'absolute',
    right: layout.screenGutter,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  card: {
    position: 'absolute',
    left: CARD_INSET,
    right: CARD_INSET,
    gap: 14,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapCard,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addressIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  addressText: {
    flex: 1,
    gap: spacing.xxs,
  },
  addressName: {
    fontFamily: typography.bodySemibold.fontFamily,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  addressPending: {
    color: colors.textTertiary,
  },
  coordinates: {
    ...typography.caption,
    lineHeight: 15,
    color: colors.textSecondary,
  },
});
