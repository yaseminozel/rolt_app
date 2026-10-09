import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  Bookmark,
  BookmarkSolid,
  Compass,
  NavArrowLeft,
  SoundHigh,
  SoundOff,
} from 'iconoir-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GpsDevPanel } from '@/components/dev/GpsDevPanel';
import { Dialog } from '@/components/feedback/Dialog';
import { MapActionButton } from '@/components/map/MapActionButton';
import { ArrivalPanel } from '@/components/navigation/ArrivalPanel';
import { GuidanceCard, type GuidanceIcon } from '@/components/navigation/GuidanceCard';
import { NavigationBanner } from '@/components/navigation/NavigationBanner';
import { NavigationChip } from '@/components/navigation/NavigationChip';
import { NavigationMapView } from '@/components/navigation/NavigationMapView';
import { NavigationSpeedBadge } from '@/components/navigation/NavigationSpeedBadge';
import { NavigationSummary } from '@/components/navigation/NavigationSummary';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import {
  formatStopDistance,
  maneuverIconKind,
  maneuverSubtitle,
  maneuverTitle,
} from '@/features/navigation/instructions';
import {
  createNavigationLocationSource,
  type SimulationScenario,
} from '@/features/navigation/location';
import type { NavigationSnapshot } from '@/features/navigation/navigationTracker';
import { useLowBattery } from '@/features/device/useLowBattery';
import { haptics } from '@/features/haptics/haptics';
import { useHapticOnSet } from '@/features/haptics/useHapticOnSet';
import { navigationActivityProps } from '@/features/liveActivity/rideActivityProps';
import { LIVE_ACTIVITY_INTERVAL_MS, rideLiveActivity } from '@/features/liveActivity/rideLiveActivity';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import type { NavigationPlan } from '@/features/navigation/types';
import { useNavigationSession } from '@/features/navigation/useNavigationSession';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import type { CompletedRide } from '@/features/rides/completedRide';
import { ridesRepository } from '@/features/rides/ridesRepository';
import {
  formatClockTime,
  formatDistance,
  formatDuration,
  formatRideClock,
  formatSpeed,
} from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, layout, radius, spacing } from '@/theme';

const KEEP_AWAKE_TAG = 'rolt-navigation';
/** Guidance sits 7 pt under the status bar (06.06 "Yönlendirme" at y 56). */
const GUIDANCE_TOP = 7;
/** Map buttons and the speed badge sit this far above the screen bottom (over the summary panel). */
const MAP_CONTROLS_BOTTOM = 160;
/** 52 pt speed badge + 12 pt gap: the developer GPS pill sits above it. */
const DEV_PANEL_BOTTOM = MAP_CONTROLS_BOTTOM + 52 + spacing.md;
const SCENARIOS: readonly SimulationScenario[] = [
  'normal',
  'offRoute',
  'weakGps',
  'lostGps',
  'break',
];

/**
 * 06.06 Rotayı sür / Navigasyon — Pencil `U8tb82` (turn ahead), `kBA4X` (rotadan çıktın),
 * `k77dxc` (rotaya bağlandın), `vJsL5` (durağa varış), `CgYf0` (durakta mola), `gG4iA` (sonraki
 * durağa devam), `CUBTG` (GPS zayıf), `VpgEM` (çıkış onayı) and 06.07 Varış (`wbn2e`).
 * The map follows the rider course-up (the compass restores it after a pan), the card shows
 * the next maneuver, banners and chips show route, GPS and stop states without asking anything,
 * and the summary panel turns into the arrival panel at the finish.
 */
export default function NavigateScreen() {
  const session = useRideSession();
  // The plan is fixed when navigation starts; Hazırlık (still mounted underneath) may re-plan later.
  const [plan] = useState(session.plan);
  if (!plan) {
    return (
      <Redirect
        href={{ pathname: '/ride/[routeId]/prepare', params: { routeId: session.route.id } }}
      />
    );
  }
  return <Navigation plan={plan} />;
}

function Navigation({ plan }: { plan: NavigationPlan }) {
  const { routeId, scenario } = useLocalSearchParams<{ routeId: string; scenario?: string }>();
  const { t } = useTranslation(['ride', 'common']);
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const session = useRideSession();
  const { route, stops, voiceEnabled, setVoiceEnabled, keepScreenOn, endRequested } = session;
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const [following, setFollowing] = useState(true);
  const [discardVisible, setDiscardVisible] = useState(false);
  const now = useNow(5_000);
  const ended = useRef(false);

  const trackedStops = useMemo(
    () => stops.map((stop) => ({ id: stop.id, name: stop.name, coordinates: stop.coordinates })),
    [stops],
  );
  const [source] = useState(() =>
    createNavigationLocationSource({
      line: plan.geometry,
      stops: stops.map((stop) => stop.coordinates),
      scenario: SCENARIOS.find((item) => item === scenario),
      notification: {
        title: t('navigation.notificationTitle'),
        body: t('navigation.notificationBody'),
      },
    }),
  );
  const { snapshot, plan: activePlan } = useNavigationSession({
    plan,
    stops: trackedStops,
    source,
    voiceEnabled,
  });
  // 06.07: arrival is felt; nothing else buzzes on the move (the phone sits in a vibrating mount).
  useHapticOnSet(snapshot.finished, 'success');

  // Below 10 % on battery the screen may sleep: voice guidance carries on with it locked.
  const criticalBattery = useLowBattery()?.tier === 'critical';
  const awake = keepScreenOn && !criticalBattery;
  useEffect(() => {
    if (!awake) {
      return;
    }
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [awake]);
  useEffect(() => {
    if (criticalBattery && keepScreenOn) {
      showToast({ variant: 'info', message: t('navigation.batteryCritical') });
    }
    // Once per drop below the threshold, not on every toggle of the setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalBattery]);

  const finishRide = useCallback(
    (current: NavigationSnapshot, completed: boolean) => {
      if (ended.current) {
        return;
      }
      ended.current = true;
      const { ride } = current;
      const completedRide: CompletedRide = {
        routeId: route.id,
        routeName: route.name,
        distanceM: ride.distanceM,
        movingS: ride.movingS,
        breakS: ride.breakS,
        breakCount: ride.breakCount,
        elapsedS: ride.elapsedS,
        averageSpeedMps: ride.movingS > 0 ? ride.distanceM / ride.movingS : 0,
        maxSpeedMps: ride.maxSpeedMps,
        maxLeanLeftDeg: ride.maxLeanLeftDeg,
        maxLeanRightDeg: ride.maxLeanRightDeg,
        track: ride.track,
        startedAt: ride.startedAt,
        endedAt: Date.now(),
        completed,
      };
      // The ride becomes a draft on the device, then "Sürüşü kaydet" (08.05) opens for it.
      ridesRepository
        .createDraftFromNavigation(completedRide, route)
        .then((draft) =>
          router.replace({ pathname: '/rides/[rideId]/save', params: { rideId: draft.id } }),
        )
        .catch(() => {
          showToast({ variant: 'failure', message: t('arrival.saveFailed') });
          ended.current = false;
        });
    },
    [route, showToast, t],
  );

  // "Bitir" on the exit sheet: route tracking stops; the ride so far goes to Record.
  useEffect(() => {
    if (endRequested) {
      finishRide(snapshot, false);
    }
  }, [endRequested, finishRide, snapshot]);

  const leaveWithoutSaving = () => {
    ended.current = true;
    setDiscardVisible(false);
    router.dismissTo({ pathname: '/route/[id]', params: { id: route.id } });
  };

  const stopName = (index: number | null) => (index === null ? '' : (stops[index]?.name ?? ''));

  // Guidance card content.
  let guidance: { icon: GuidanceIcon; title: string; subtitle: string };
  if (snapshot.arrivedStopIndex !== null) {
    guidance = {
      icon: 'stopReached',
      title: t('navigation.arrivedStop', { number: snapshot.arrivedStopIndex + 1 }),
      subtitle: stopName(snapshot.arrivedStopIndex),
    };
  } else if (snapshot.nextStep) {
    const arriving = snapshot.nextStep.type === 'arrive';
    const stopNumber =
      arriving && snapshot.nextStopIndex !== null ? snapshot.nextStopIndex + 1 : null;
    guidance = {
      icon: arriving
        ? stopNumber !== null
          ? 'arrive'
          : 'finish'
        : maneuverIconKind(snapshot.nextStep),
      title: maneuverTitle(snapshot.nextStep, snapshot.distanceToNextStepM, t, { stopNumber }),
      subtitle: arriving
        ? stopName(snapshot.nextStopIndex) || t('maneuver.followRoute')
        : maneuverSubtitle(snapshot.nextStep, t),
    };
  } else {
    guidance = {
      icon: 'straight',
      title: t('maneuver.now.straight'),
      subtitle: t('maneuver.followRoute'),
    };
  }

  let banner = null;
  if (snapshot.offRoute) {
    banner = (
      <NavigationBanner
        tone="offRoute"
        busy
        title={t('navigation.offRouteTitle')}
        description={t('navigation.offRouteDescription')}
      />
    );
  } else if (snapshot.reconnectedAddedMinutes !== null) {
    banner = (
      <NavigationBanner
        tone="reconnected"
        title={t('navigation.reconnectedTitle')}
        description={t('navigation.reconnectedDescription', {
          count: snapshot.reconnectedAddedMinutes,
        })}
      />
    );
  } else if (snapshot.gps !== 'ok') {
    banner = (
      <NavigationBanner
        tone="gps"
        title={
          snapshot.gps === 'lost' ? t('navigation.gpsLostTitle') : t('navigation.gpsWeakTitle')
        }
        description={t('navigation.gpsDescription')}
      />
    );
  }

  let chip = null;
  if (snapshot.breakStopIndex !== null) {
    chip = (
      <NavigationChip
        kind="break"
        title={t('navigation.breakStop', {
          number: snapshot.breakStopIndex + 1,
          name: stopName(snapshot.breakStopIndex),
        })}
        label={t('navigation.breakLabel')}
      />
    );
  } else if (
    snapshot.nextStopIndex !== null &&
    snapshot.distanceToNextStopM !== null &&
    snapshot.arrivedStopIndex === null
  ) {
    chip = (
      <NavigationChip
        kind="nextStop"
        number={snapshot.nextStopIndex + 1}
        label={t('navigation.nextStop', {
          name: stopName(snapshot.nextStopIndex),
          distance: formatStopDistance(snapshot.distanceToNextStopM, t),
        })}
      />
    );
  }

  const remainingMinutes = Math.max(1, Math.round(snapshot.remainingS / 60));
  const remaining =
    remainingMinutes < 60
      ? t('units.minutes', { value: remainingMinutes })
      : formatDuration(remainingMinutes);
  const arrivalTime = formatClockTime(new Date(now + snapshot.remainingS * 1000));
  const finish = activePlan.geometry[activePlan.geometry.length - 1];
  const saved = isSaved(route.id);

  const rideTiles = [
    {
      key: 'distance',
      label: t('arrival.metrics.distance'),
      value: formatDistance(snapshot.ride.distanceM / 1000, 1),
    },
    {
      key: 'duration',
      label: t('arrival.metrics.duration'),
      value: formatRideClock(snapshot.ride.movingS),
    },
    {
      key: 'speed',
      label: t('arrival.metrics.averageSpeed'),
      value: formatSpeed(
        snapshot.ride.movingS > 0 ? (snapshot.ride.distanceM / snapshot.ride.movingS) * 3.6 : 0,
      ),
    },
  ];

  // Lock Screen / Dynamic Island: the next maneuver and the ride so far, until the finish.
  const activityTitle = guidance.title;
  const activitySubtitle = guidance.subtitle;
  useEffect(() => {
    if (snapshot.finished) {
      rideLiveActivity.end();
      return;
    }
    rideLiveActivity.show(
      navigationActivityProps(snapshot, { title: activityTitle, subtitle: activitySubtitle }, route.name),
      LIVE_ACTIVITY_INTERVAL_MS.navigation,
    );
  }, [activitySubtitle, activityTitle, route.name, snapshot]);
  useEffect(() => () => rideLiveActivity.end(), []);

  return (
    <View style={styles.screen}>
      <NavigationMapView
        line={activePlan.geometry}
        stops={trackedStops.map((stop, index) => ({
          id: stop.id,
          coordinates: stop.coordinates,
          reached: snapshot.stops[index]?.reached,
        }))}
        finish={finish}
        rider={
          snapshot.position
            ? {
                position: snapshot.position,
                headingDeg: snapshot.headingDeg,
                weakSignal: snapshot.gps !== 'ok',
              }
            : null
        }
        camera={
          following && !snapshot.finished
            ? { mode: 'follow' }
            : { mode: 'overview', padding: { top: 160, right: 40, bottom: 520, left: 40 } }
        }
        onUserGesture={() => setFollowing(false)}
      />

      {snapshot.finished ? (
        <View style={[styles.topActions, { top: insets.top }]}>
          <MapActionButton
            icon={NavArrowLeft}
            accessibilityLabel={t('common:actions.back')}
            onPress={() => setDiscardVisible(true)}
          />
          <MapActionButton
            icon={saved ? BookmarkSolid : Bookmark}
            accessibilityLabel={t('common:actions.save')}
            selected={saved}
            onPress={() => toggleBookmark(route.id)}
          />
        </View>
      ) : (
        <View
          style={[styles.guidance, { top: insets.top + GUIDANCE_TOP }]}
          pointerEvents="box-none">
          <GuidanceCard icon={guidance.icon} title={guidance.title} subtitle={guidance.subtitle} />
          {banner}
          {chip}
        </View>
      )}

      {snapshot.finished ? null : (
        <NavigationSpeedBadge
          speedMps={snapshot.speedMps}
          known={snapshot.gps === 'ok'}
          style={styles.speed}
        />
      )}
      {snapshot.finished ? null : <GpsDevPanel opensUpward style={styles.devPanel} />}

      {snapshot.finished ? null : (
        <View style={styles.mapActions} pointerEvents="box-none">
          <MapSquareButton
            onPress={() => setFollowing(true)}
            accessibilityLabel={t('navigation.compassA11y')}
            icon={<Compass width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />}
          />
          <MapSquareButton
            onPress={() => {
              haptics.select();
              setVoiceEnabled(!voiceEnabled);
            }}
            accessibilityLabel={
              voiceEnabled ? t('navigation.soundOnA11y') : t('navigation.soundOffA11y')
            }
            icon={
              voiceEnabled ? (
                <SoundHigh width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
              ) : (
                <SoundOff width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
              )
            }
          />
        </View>
      )}

      <View style={styles.bottom}>
        {snapshot.finished ? (
          <ArrivalPanel
            title={t('arrival.title')}
            description={t('arrival.description')}
            tiles={rideTiles}
            saveLabel={t('arrival.save')}
            leaveLabel={t('arrival.leave')}
            onSave={() => finishRide(snapshot, true)}
            onLeave={() => setDiscardVisible(true)}
          />
        ) : (
          <NavigationSummary
            remaining={remaining}
            detail={t('navigation.distanceArrival', {
              distance: formatStopDistance(snapshot.remainingM, t),
              time: arrivalTime,
            })}
            finishLabel={t('navigation.finish')}
            onFinish={() =>
              router.push({ pathname: '/ride/[routeId]/exit-confirm', params: { routeId } })
            }
          />
        )}
      </View>

      <Modal
        visible={discardVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDiscardVisible(false)}>
        <View style={styles.dialogScrim}>
          <Dialog
            status="error"
            title={t('discard.title')}
            description={t('discard.description')}
            actionsLayout="column"
            actions={[
              <Button key="leave" label={t('discard.confirm')} onPress={leaveWithoutSaving} />,
              <Button
                key="back"
                variant="text"
                label={t('discard.cancel')}
                onPress={() => setDiscardVisible(false)}
              />,
            ]}
          />
        </View>
      </Modal>
    </View>
  );
}

/** "Action / Pusula" and "Action / Ses" (06.06): 48 pt square map buttons. */
function MapSquareButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.squareButton, pressed && styles.squareButtonPressed]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  guidance: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  topActions: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapActions: {
    position: 'absolute',
    right: layout.screenGutter,
    bottom: MAP_CONTROLS_BOTTOM,
    gap: spacing.md,
  },
  speed: {
    position: 'absolute',
    left: layout.screenGutter,
    bottom: MAP_CONTROLS_BOTTOM,
  },
  devPanel: {
    left: layout.screenGutter,
    bottom: DEV_PANEL_BOTTOM,
  },
  squareButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  squareButtonPressed: {
    backgroundColor: colors.surfacePressed,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dialogScrim,
  },
});
