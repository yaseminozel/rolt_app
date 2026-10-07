import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'iconoir-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InfoNote } from '@/components/feedback/InfoNote';
import { Toast } from '@/components/feedback/Toast';
import { useToast } from '@/components/feedback/ToastProvider';
import { MetricTiles, type MetricTile } from '@/components/navigation/MetricTiles';
import { NavigationMapView } from '@/components/navigation/NavigationMapView';
import { RidePointsCard } from '@/components/navigation/RidePointsCard';
import { RideToggleCard } from '@/components/navigation/RideToggleCard';
import { Button } from '@/components/ui/Button';
import { wasBackgroundPromptShown } from '@/features/navigation/backgroundPrompt';
import { navigationDirections } from '@/features/navigation/directions';
import { formatStopDistance } from '@/features/navigation/instructions';
import { isSimulatedNavigation } from '@/features/navigation/location';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import {
  APPROACH_THRESHOLD_M,
  buildRidePoints,
  distanceToStart,
  isStopOrderReversed,
  rideLine,
} from '@/features/navigation/ridePlan';
import type { RideStop } from '@/features/navigation/types';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { formatApproxDuration, formatClockTime, formatDistance } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';

/** The points card sits 7 pt under the status bar (y 56 in 06.01). */
const CARD_TOP = 7;
/** Toasts above the "Başla" bar. */
const TOAST_OFFSET = 44 + spacing.lg * 2;

type PlanState = 'loading' | 'ready' | 'error';

/**
 * 06.01 Rotayı sür / Hazırlık — Pencil `N8AE4` (far from the start: approach leg first),
 * `ruyMB` (at the start), `v2Klw` (with stops). The route on the map, the points card (close,
 * ⇅, stops with × and ≡), and a sheet with the summary, "Durak ekle" (up to three), voice and
 * screen toggles and "Başla". "Başla" shows the background-location explainer once (06.04,
 * note `E0DAxE`) and then the countdown (06.05).
 */
export default function RidePrepareScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation(['ride', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const session = useRideSession();
  const { route, reversed, stops, plan, setPlan, setHasApproach } = session;
  const { position, locate } = useDeviceLocation();
  const [planResult, setPlanResult] = useState<{ key: string; state: Exclude<PlanState, 'loading'> } | null>(null);
  const now = useNow();
  const [attempt, setAttempt] = useState(0);
  const [foregroundOnly, setForegroundOnly] = useState(false);
  const [starting, setStarting] = useState(false);

  const line = useMemo(() => rideLine(route, reversed), [route, reversed]);
  const startDistance = isSimulatedNavigation ? null : distanceToStart(position, line);
  const approach = startDistance !== null && startDistance > APPROACH_THRESHOLD_M;
  // Re-plan only when the approach origin moves meaningfully (~100 m grid), not on GPS jitter.
  const originKey = approach && position ? `${position[0].toFixed(3)},${position[1].toFixed(3)}` : '';
  const planKey = `${reversed}|${stops.map((stop) => stop.id).join(',')}|${originKey}|${attempt}`;
  const planState: PlanState = planResult?.key === planKey ? planResult.state : 'loading';

  useEffect(() => {
    if (!position && !isSimulatedNavigation) {
      locate();
    }
  }, [locate, position]);

  // Note `E0DAxE`: after the explainer, a foreground-only answer is flagged on Hazırlık.
  useEffect(() => {
    let active = true;
    (async () => {
      const [background, shown] = await Promise.all([
        Location.getBackgroundPermissionsAsync().catch(() => null),
        wasBackgroundPromptShown(),
      ]);
      if (active) {
        setForegroundOnly(!isSimulatedNavigation && shown && background?.granted === false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, starting]);

  useEffect(() => {
    let cancelled = false;
    const origin = originKey && position ? position : null;
    navigationDirections
      .plan(buildRidePoints({ line, stops, origin }))
      .then((next) => {
        if (!cancelled) {
          setPlan(next);
          setHasApproach(origin !== null);
          setPlanResult({ key: planKey, state: 'ready' });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlanResult({ key: planKey, state: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
    // `position` is read through `originKey` on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, stops, originKey, planKey, setPlan, setHasApproach]);

  const reversedOrder = useMemo(() => isStopOrderReversed(stops, line), [line, stops]);

  const tiles: MetricTile[] = useMemo(() => {
    const placeholder = '—';
    const ready = planState === 'ready' && plan;
    return [
      {
        key: 'distance',
        value: ready ? formatDistance(plan.distanceM / 1000, 1) : placeholder,
        label: approach ? t('prepare.metrics.distance') : t('prepare.metrics.route'),
      },
      {
        key: 'duration',
        value: ready ? formatApproxDuration(plan.durationS / 60) : placeholder,
        label: t('prepare.metrics.duration'),
      },
      {
        key: 'arrival',
        value: ready ? formatClockTime(new Date(now + plan.durationS * 1000)) : placeholder,
        label: approach ? t('prepare.metrics.arrival') : t('prepare.metrics.finish'),
      },
    ];
  }, [approach, now, plan, planState, t]);

  const removeStop = useCallback(
    (stop: RideStop) => {
      const previous = stops;
      session.removeStop(stop.id);
      showToast({
        variant: 'info',
        message: t('prepare.stopRemoved'),
        actionLabel: t('common:actions.undo'),
        onActionPress: () => session.setStops(previous),
        bottomOffset: TOAST_OFFSET,
      });
    },
    [session, showToast, stops, t],
  );

  const stopDetail = (stop: RideStop, index: number) => {
    if (reversedOrder && index > 0) {
      return { text: t('prepare.reverseOrder'), warning: true };
    }
    return {
      text: stop.detourMinutes > 0 ? t('prepare.stopDetour', { minutes: stop.detourMinutes }) : t('prepare.stopOnRoute'),
    };
  };

  const handleStart = async () => {
    if (!plan || planState !== 'ready' || starting) {
      return;
    }
    setStarting(true);
    try {
      if (!isSimulatedNavigation) {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (!foreground.granted) {
          showToast({ variant: 'failure', message: t('prepare.locationRequired'), bottomOffset: TOAST_OFFSET });
          return;
        }
        const background = await Location.getBackgroundPermissionsAsync();
        if (!background.granted && background.canAskAgain && !(await wasBackgroundPromptShown())) {
          router.push({ pathname: '/ride/[routeId]/background-permission', params: { routeId } });
          return;
        }
      }
      router.push({ pathname: '/ride/[routeId]/countdown', params: { routeId } });
    } finally {
      setStarting(false);
    }
  };

  const startPoint = approach
    ? { label: t('points.myLocation'), kind: 'device' as const }
    : { label: reversed ? route.endName : route.name, kind: 'routeStart' as const };
  const endPoint = reversed ? route.startName : route.endName;

  return (
    <View style={styles.screen}>
      <NavigationMapView
        line={plan?.geometry ?? line}
        stops={stops.map((stop) => ({ id: stop.id, coordinates: stop.coordinates }))}
        finish={line[line.length - 1]}
        rider={position && !isSimulatedNavigation ? { position, headingDeg: 0 } : null}
        camera={{ mode: 'overview', padding: { top: 200, right: 40, bottom: 480, left: 40 } }}
      />
      <View style={[styles.top, { top: insets.top + CARD_TOP }]}>
        <RidePointsCard
          start={startPoint}
          end={endPoint}
          stops={stops}
          stopDetail={stopDetail}
          onClose={() => router.back()}
          onSwap={session.toggleReversed}
          onRemoveStop={removeStop}
          onMoveStop={session.moveStop}
        />
      </View>
      <BottomSheet
        index={0}
        enableDynamicSizing
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}>
        <BottomSheetView style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {approach && startDistance !== null
                ? t('prepare.farTitle', { distance: formatStopDistance(startDistance, t) })
                : t('prepare.readyTitle')}
            </Text>
            <Text style={styles.description}>
              {approach ? t('prepare.farDescription') : t('prepare.readyDescription')}
            </Text>
          </View>
          {planState === 'error' ? (
            <View style={styles.error}>
              <Toast variant="failure" message={t('prepare.planError')} />
              <Button variant="text" label={t('prepare.retry')} onPress={() => setAttempt((value) => value + 1)} />
            </View>
          ) : (
            <View>
              <MetricTiles tiles={tiles} />
              {planState === 'loading' ? (
                <ActivityIndicator
                  style={StyleSheet.absoluteFill}
                  color={colors.textSecondary}
                  accessibilityLabel={t('prepare.a11y.loading')}
                />
              ) : null}
            </View>
          )}
          <AddStopButton
            label={t('prepare.addStop')}
            disabled={!session.canAddStop}
            onPress={() => router.push({ pathname: '/ride/[routeId]/add-stop', params: { routeId } })}
          />
          <RideToggleCard
            toggles={[
              { key: 'voice', label: t('prepare.voiceGuidance'), value: session.voiceEnabled, onChange: session.setVoiceEnabled },
              { key: 'awake', label: t('prepare.keepScreenOn'), value: session.keepScreenOn, onChange: session.setKeepScreenOn },
            ]}
          />
          {foregroundOnly ? <InfoNote text={t('prepare.foregroundOnlyNote')} /> : null}
          <Button
            label={t('prepare.start')}
            onPress={handleStart}
            loading={starting}
            disabled={planState !== 'ready'}
            style={styles.start}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

/** "Durak ekle": brand-tinted button, inactive at three stops (no counter, note `mUNKb`). */
function AddStopButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.addStop, pressed && styles.addStopPressed, disabled && styles.addStopDisabled]}>
      <Plus width={20} height={20} color={disabled ? colors.textDisabled : colors.brand} strokeWidth={1.8} />
      <Text style={[styles.addStopLabel, disabled && styles.addStopLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  top: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  sheetBackground: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
  },
  sheet: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  error: {
    gap: spacing.xs,
  },
  addStop: {
    height: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.infoSubtle,
  },
  addStopPressed: {
    backgroundColor: colors.infoSurface,
  },
  addStopDisabled: {
    backgroundColor: colors.surfaceDisabled,
  },
  addStopLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brand,
  },
  addStopLabelDisabled: {
    color: colors.textDisabled,
  },
  start: {
    marginTop: spacing.xs,
  },
});
