import { router } from 'expo-router';
import { Map as MapIcon, Position } from 'iconoir-react-native';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { useToast } from '@/components/feedback/ToastProvider';
import { NoRouteCard } from '@/components/route-builder/NoRouteCard';
import { RoutePreviewMap } from '@/components/route-builder/RoutePreviewMap';
import { SuggestionExitGuard } from '@/components/route-builder/SuggestionExitGuard';
import { WaypointList } from '@/components/route-builder/WaypointList';
import { Button } from '@/components/ui/Button';
import { StepProgress } from '@/components/ui/StepProgress';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { placeSuffixes } from '@/features/route-suggestion/placeFormat';
import { waypointAtRoutedIndex } from '@/features/route-suggestion/routeEditing';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { NoRouteError, placeSearch } from '@/features/route-suggestion/services';
import { MAX_STOPS, type Waypoint } from '@/features/route-suggestion/types';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

/** "Rota öner" steps: location (04.1), details (04.2), preview (04.3). */
const TOTAL_STEPS = 3;
const CONTENT_GUTTER = 32;
/** The map card shrinks in the no-route state so the explanation fits (04.1 `WwIGh`). */
const ERROR_MAP_HEIGHT = 108;
const TOAST_OFFSET = 88;

/**
 * 04.1 Konum seçimi — filled (`D8XrfG`), empty (`XrNal`), calculating (`T0rX4`) and no road
 * (`aIGJ2`). Start / stops / end in the stop card, a schematic preview of the calculated line and
 * "Devam et" once the route is ready. Rows open the full-screen search; "Haritada düzenle" opens
 * the map editor.
 */
export default function SuggestRouteLocationScreen() {
  const { t } = useTranslation(['routeSuggestion', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { locate } = useDeviceLocation();
  const {
    draft,
    routeCalculation,
    canContinueFromLocation,
    setWaypointPlace,
    addStop,
    removeStop,
    moveStop,
    swapEnds,
    recalculate,
  } = useRouteSuggestion();
  const [locating, setLocating] = useState(false);

  const { waypoints } = draft;
  const start = waypoints[0];
  const stopCount = waypoints.length - 2;

  const error = routeCalculation.status === 'error' ? routeCalculation.error : null;
  const noRoute = error instanceof NoRouteError ? error : null;
  const errorWaypoint = noRoute ? waypointAtRoutedIndex(waypoints, noRoute.waypointIndex) : null;

  /** Reason ("Büyükada’da motorlu taşıt trafiğine izin verilmiyor.") plus the suggestion or a hint. */
  const noRouteMessage = (routeError: NoRouteError, waypoint: Waypoint) => {
    const placeName = waypoint.place?.name ?? '';
    const reason =
      routeError.reason === 'noMotorVehicles'
        ? t('location.noRoute.noMotorVehicles', { place: placeName, locative: placeSuffixes(placeName).locative })
        : t('location.noRoute.unreachable');
    const next = routeError.alternative
      ? t(`location.noRoute.suggestion_${waypoint.kind}`, {
          alternative: routeError.alternative.name,
          accusative: placeSuffixes(routeError.alternative.name).accusative,
        })
      : t('location.noRoute.noSuggestion');
    return `${reason} ${next}`;
  };

  const openSearch = (waypoint: Pick<Waypoint, 'id'>) =>
    router.push({ pathname: '/suggest-route/search', params: { waypointId: waypoint.id } });

  // "Ara durak ekle" adds an empty stop and goes straight to its search.
  const searchNewStop = useRef(false);
  const newStop = waypoints[waypoints.length - 2];
  useEffect(() => {
    if (searchNewStop.current && newStop?.kind === 'stop' && newStop.place === null) {
      searchNewStop.current = false;
      router.push({ pathname: '/suggest-route/search', params: { waypointId: newStop.id } });
    }
  }, [newStop]);

  const handleAddStop = () => {
    if (stopCount >= MAX_STOPS) {
      showToast({ variant: 'failure', message: t('location.maxStops', { count: MAX_STOPS }), bottomOffset: TOAST_OFFSET });
      return;
    }
    searchNewStop.current = true;
    addStop();
  };

  const fillStartWithCurrentLocation = async () => {
    if (!start) {
      return;
    }
    setLocating(true);
    try {
      const coordinates = await locate();
      if (!coordinates) {
        showToast({ variant: 'failure', message: t('search.locationUnavailable'), bottomOffset: TOAST_OFFSET });
        return;
      }
      const place = await placeSearch.reverse(coordinates).catch(() => null);
      setWaypointPlace(start.id, place ?? { id: 'current-location', name: t('location.currentLocation'), coordinates });
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <StepProgress total={TOTAL_STEPS} current={1} />
        <Text style={styles.title} accessibilityRole="header">
          {t('location.title')}
        </Text>
        <Text style={styles.description}>{t('location.description')}</Text>

        <WaypointList
          waypoints={waypoints}
          errorWaypointId={errorWaypoint?.id ?? null}
          onPressWaypoint={openSearch}
          onSwap={swapEnds}
          onRemoveStop={removeStop}
          onMoveStop={moveStop}
          onAddStop={handleAddStop}
          maxStops={MAX_STOPS}
        />

        {start && start.place === null ? (
          <View style={styles.shortcuts}>
            <Shortcut icon={Position} label={t('location.currentLocation')} busy={locating} onPress={fillStartWithCurrentLocation} />
            <Shortcut
              icon={MapIcon}
              label={t('location.pickOnMap')}
              onPress={() => router.push({ pathname: '/suggest-route/pick-on-map', params: { waypointId: start.id } })}
            />
          </View>
        ) : null}

        <RoutePreviewMap
          preview={draft.preview}
          waypoints={waypoints}
          status={routeCalculation.status}
          errorLabel={t('preview.error')}
          emptyMessage={t('preview.empty')}
          errorWaypointId={errorWaypoint?.id ?? null}
          onEdit={() => router.push('/suggest-route/edit-on-map')}
          style={error ? styles.errorMap : undefined}
        />

        {noRoute && errorWaypoint ? (
          <NoRouteCard
            title={t('location.noRoute.title')}
            message={noRouteMessage(noRoute, errorWaypoint)}
            primaryAction={
              noRoute.alternative
                ? {
                    label: t('location.noRoute.useAlternative', {
                      alternative: noRoute.alternative.name,
                      accusative: placeSuffixes(noRoute.alternative.name).accusative,
                    }),
                    onPress: () => setWaypointPlace(errorWaypoint.id, noRoute.alternative),
                  }
                : undefined
            }
            secondaryAction={{ label: t('location.noRoute.change'), onPress: () => openSearch(errorWaypoint) }}
          />
        ) : error ? (
          <NoRouteCard
            title={t('location.routeFailed.title')}
            message={t('location.routeFailed.description')}
            primaryAction={{ label: t('location.routeFailed.retry'), onPress: recalculate }}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button
          label={t('common:actions.continue')}
          size="lg"
          disabled={!canContinueFromLocation}
          onPress={() => router.push('/suggest-route/details')}
        />
      </View>
      <SuggestionExitGuard />
    </View>
  );
}

type ShortcutProps = {
  icon: ComponentType<SvgProps>;
  label: string;
  busy?: boolean;
  onPress: () => void;
};

/** Quick pick chips of the empty state (04.1 `p4uAaf` "Hızlı seçim"): they fill the start. */
function Shortcut({ icon: Icon, label, busy = false, onPress }: ShortcutProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy }}
      hitSlop={(layout.minTouchTarget - SHORTCUT_HEIGHT) / 2}
      style={({ pressed }) => [styles.shortcut, (pressed || busy) && styles.shortcutPressed]}>
      <Icon width={15} height={15} color={colors.brand} strokeWidth={1.8} />
      <Text style={styles.shortcutLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const SHORTCUT_HEIGHT = 40;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: CONTENT_GUTTER,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textBody,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcut: {
    flex: 1,
    height: SHORTCUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  shortcutPressed: {
    backgroundColor: colors.surfacePressed,
  },
  shortcutLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  errorMap: {
    height: ERROR_MAP_HEIGHT,
  },
  bottomBar: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
