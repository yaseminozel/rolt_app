import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { Collapse, Expand, NavArrowDown, NavigatorAlt } from 'iconoir-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GpsDevPanel } from '@/components/dev/GpsDevPanel';
import { LayersIcon } from '@/components/explore/LayersIcon';
import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { isNativeMapAvailable } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import type { MapStyle } from '@/components/map/mapStyles';
import { MapStatusBanner, type MapStatusBannerTone } from '@/components/record/MapStatusBanner';
import { RecordMapView, type RecenterRequest } from '@/components/record/RecordMapView';
import { RecordMetrics } from '@/components/record/RecordMetrics';
import { RECORD_SHEET_TOP_GAP, useSheetTopInset } from '@/components/record/recordSheetLayout';
import { RideTypeSelector } from '@/components/ride/RideTypeSelector';
import { Button } from '@/components/ui/Button';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { useLowBattery } from '@/features/device/useLowBattery';
import { haptics, withHaptic } from '@/features/haptics/haptics';
import { useHapticOnChange, useHapticOnSet } from '@/features/haptics/useHapticOnSet';
import { wasBackgroundPromptShown } from '@/features/navigation/backgroundPrompt';
import { isSimulatedNavigation } from '@/features/navigation/location';
import { MIN_SAVE_DISTANCE_M, useRideRecording, useRideTrack } from '@/features/rides/RideRecordingProvider';
import type { RideType } from '@/features/rides/rideTypes';
import { formatDistance, formatNumber } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';
import { calibrationFlow, usePendingCalibrationStart } from '@/features/lean/calibrationFlow';
import { isLeanSensorAvailable } from '@/features/lean/leanSensor';

const illustration = require('../../../assets/images/location-off-illustration.png');

/** "GPS hazır" stays this long after the first usable fix (08.01 `WwqPE`). */
const READY_BANNER_MS = 3_000;
/** "Sürüş çok kısa" (08.04) disappears after this long. */
const TOO_SHORT_BANNER_MS = 4_000;
const KEEP_AWAKE_TAG = 'rolt-recording';
/** "Konumum" before the first fix accepts a system fix this recent. */
const LOCATE_MAX_AGE_MS = 10_000;
/** Timed banners are checked this often. */
const BANNER_TICK_MS = 500;
const EXPAND_BUTTON = 36;
/** The developer GPS pill sits under the 48 pt close button. */
const DEV_PANEL_OFFSET = 48 + spacing.md;
/** "Top fade" (`iz6RG`): 64 pt of white over the map under the sheet's top edge. */
const TOP_FADE_HEIGHT = 64;
/** Grabber (`un0E9`): 40 × 5, 15 pt under the panel's top, the title row right below it. */
const GRABBER_TOP = 15;
const GRABBER_HEIGHT = 5;
/** Dragging the grabber this far (or flicking it) collapses or expands the panel. */
const DRAG_THRESHOLD = 24;
const FLICK_VELOCITY = 400;
/** The panel follows the finger, damped, within these limits. */
const DRAG_MIN = -32;
const DRAG_MAX = 140;
const PANEL_SPRING = { damping: 24, stiffness: 420, mass: 0.5 } as const;
const PANEL_LAYOUT = LinearTransition.springify().damping(24).stiffness(420).mass(0.5);

type LocationAccess = 'unknown' | 'granted' | 'askable' | 'blocked';

/**
 * 08.01–08.04 Kaydet as a sheet over the tabs (Pencil `w90Kk` "Record sheet"): the Kaydet tab
 * presents it (a native page sheet: system open / close animation, the tabs behind it), "⌄"
 * (`gJbXp`) closes it. The map with the rider and the controls panel; dragging the panel's
 * handle (`un0E9`) down tucks the ride type and the note away and zooms the map in, dragging it
 * up brings them back — "Başlat" / "Duraklat" stay on screen either way. The recording itself
 * lives in `RideRecordingProvider`, so it keeps going with the sheet closed; "Bitir" hands the
 * ride to the save form (08.05).
 */
export default function RecordScreen() {
  const { t } = useTranslation(['rides', 'common', 'explore']);
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const recording = useRideRecording();
  const track = useRideTrack();
  const topOffset = useSheetTopInset() + RECORD_SHEET_TOP_GAP;
  const [collapsed, setCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const drag = useSharedValue(0);
  const { active, interrupted, preview, startPreview } = recording;

  const [rideType, setRideType] = useState<RideType>('city');
  const [access, setAccess] = useState<LocationAccess>(
    isSimulatedNavigation ? 'granted' : 'unknown',
  );
  const [fullScreen, setFullScreen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [recenter, setRecenter] = useState<RecenterRequest | null>(null);
  const { showToast } = useToast();
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const now = useNow(BANNER_TICK_MS);
  const [tooShortUntil, setTooShortUntil] = useState(0);
  // 08.04: after "Bitir" turned out too short, the ride can be cancelled instead (it may have
  // been started by mistake) until it passes the minimum distance.
  const [tooShortRideId, setTooShortRideId] = useState<string | null>(null);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  // Flow B: after the background permission sheet, the start the rider asked for goes ahead.
  const pendingStart = useRef(false);

  const readLocationAccess = useCallback(async () => {
    if (isSimulatedNavigation) {
      return;
    }
    const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
    setAccess(
      permission?.granted ? 'granted' : permission?.canAskAgain === false ? 'blocked' : 'askable',
    );
  }, []);

  const beginRecording = useCallback(async () => {
    setBusy(true);
    try {
      await recording.start({ rideType });
      haptics.thud();
      setFollow(true);
    } finally {
      setBusy(false);
    }
  }, [recording, rideType]);

  useFocusEffect(
    useCallback(() => {
      readLocationAccess();
      if (pendingStart.current) {
        pendingStart.current = false;
        beginRecording();
      }
    }, [beginRecording, readLocationAccess]),
  );

  // Back from 08.00 Kalibrasyon ("Kayda geç" / "Atla"): carry on with the start.
  const calibrationStart = usePendingCalibrationStart();

  // GPS warm-up while waiting on "Başlat".
  const previewing = !active && !interrupted && access === 'granted';
  useFocusEffect(
    useCallback(() => (previewing ? startPreview() : undefined), [previewing, startPreview]),
  );

  const gpsReady = preview.gps === 'ready';
  // 08.01: the GPS turning ready is felt like calibration turning green.
  useHapticOnSet(previewing && gpsReady, 'press');
  useHapticOnChange(collapsed, 'tap');

  // `calibrated`: back from 08.00 ("Kayda geç" / "Atla"), so the start goes on to recording.
  const handleStart = (calibrated = false) =>
    requireAccount('saveRide', async () => {
      if (!isSimulatedNavigation) {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (!foreground.granted) {
          await readLocationAccess();
          return;
        }
        // 08.00: every start on a phone with motion sensors sets the lean angle's zero first
        // (the phone sits differently in the mount each ride).
        if (!calibrated && (await isLeanSensorAvailable())) {
          router.push({ pathname: '/record-ride/calibrate', params: { then: 'record' } });
          return;
        }
        const background = await Location.getBackgroundPermissionsAsync();
        if (!background.granted && background.canAskAgain && !(await wasBackgroundPromptShown())) {
          pendingStart.current = true;
          router.push('/record-ride/background-permission');
          return;
        }
      }
      await beginRecording();
    });

  useEffect(() => {
    if (calibrationStart && calibrationFlow.takeStart()) {
      handleStart(true);
    }
    // `handleStart` changes every render; the start runs once per hand-off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrationStart]);

  const handleFinish = async () => {
    setBusy(true);
    try {
      const result = await recording.finish();
      if (result.kind === 'tooShort') {
        haptics.warning();
        setTooShortRideId(result.rideId);
        setTooShortUntil(Date.now() + TOO_SHORT_BANNER_MS);
        return;
      }
      haptics.press();
      setFullScreen(false);
      // The save form takes the sheet's place: a screen pushed under a native modal would stay
      // hidden behind it on iOS.
      router.replace({ pathname: '/rides/[rideId]/save', params: { rideId: result.rideId } });
    } finally {
      setBusy(false);
    }
  };

  const handleRecoveryFinish = async () => {
    await recording.restoreInterrupted();
    await handleFinish();
  };

  const handleAllowLocation = async () => {
    if (access === 'blocked') {
      Linking.openSettings();
      return;
    }
    await Location.requestForegroundPermissionsAsync().catch(() => null);
    await readLocationAccess();
  };

  const confirmDelete = async () => {
    setDeleteVisible(false);
    await recording.discard();
    haptics.press();
  };

  const confirmCancel = async () => {
    setCancelVisible(false);
    setTooShortUntil(0);
    await recording.discard();
    haptics.press();
  };

  // "⌄" and "Şimdi değil": the sheet goes back down; a running recording carries on.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/discover');
    }
  };

  const snapshot = active?.snapshot;
  const phase = snapshot?.phase;
  const autoPaused = snapshot?.autoPaused === true;

  // While a ride is being recorded with this sheet open the screen stays on (the phone sits in
  // the mount, as in navigation); paused, closed or locked by hand, the phone sleeps as usual.
  // On a low battery the screen is let go too: the ride outlasting the phone matters more.
  const focused = useIsFocused();
  const lowBattery = useLowBattery();
  const keepAwake = focused && phase === 'recording' && !lowBattery;
  useHapticOnSet(active ? lowBattery?.tier : null, 'warning');
  useEffect(() => {
    if (!keepAwake) {
      return;
    }
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [keepAwake]);
  const shownInterrupted = !active ? interrupted : null;
  // 08.03: an unfinished ride waiting on open asks for attention.
  useHapticOnSet(shownInterrupted?.id, 'warning', { onMount: true });
  const permissionMissing =
    !active && !shownInterrupted && (access === 'askable' || access === 'blocked');

  // One banner at a time, most important first.
  let banner: { tone: MapStatusBannerTone; message: string; busy?: boolean } | null = null;
  if (tooShortUntil > now) {
    banner = {
      tone: 'danger',
      message: t('record.tooShort', { distance: formatDistance(MIN_SAVE_DISTANCE_M / 1000, 1) }),
    };
  } else if (shownInterrupted) {
    banner = { tone: 'info', message: t('record.recovery.banner') };
  } else if (active && autoPaused) {
    banner = { tone: 'warning', message: t('record.gps.weak') };
  } else if (active && lowBattery) {
    banner = {
      tone: lowBattery.tier === 'critical' ? 'danger' : 'warning',
      message: t(`record.battery.${lowBattery.tier}`, {
        percent: formatNumber(lowBattery.percent),
      }),
    };
  } else if (previewing && !gpsReady) {
    banner = { tone: 'success', message: t('record.gps.searching'), busy: true };
  } else if (
    previewing &&
    preview.readySince !== null &&
    preview.readySince + READY_BANNER_MS > now
  ) {
    banner = { tone: 'success', message: t('record.gps.ready') };
  }

  const metricsSource =
    snapshot ?? (shownInterrupted ? interruptedMetrics(shownInterrupted) : null);
  const metrics = (
    <RecordMetrics
      distanceM={metricsSource?.stats.distanceM ?? 0}
      durationS={metricsSource?.stats.durationS ?? 0}
      speedMps={metricsSource?.speedMps ?? 0}
      layout={fullScreen ? 'stacked' : 'row'}
      muted={!metricsSource}
    />
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {permissionMissing ? t('record.permission.title') : t('record.title')}
      </Text>
      {permissionMissing ? null : (
        <Pressable
          onPress={() => setFullScreen((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={fullScreen ? t('record.collapse') : t('record.expand')}
          hitSlop={(layout.minTouchTarget - EXPAND_BUTTON) / 2}
          style={styles.expand}>
          {fullScreen ? (
            <Collapse width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
          ) : (
            <Expand width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
          )}
        </Pressable>
      )}
    </View>
  );

  const note = collapsed ? null : (
    <Animated.Text
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={styles.note}>
      {active && autoPaused ? t('record.weakNote') : t('record.offlineNote')}
    </Animated.Text>
  );

  const cancelMode =
    !!active &&
    active.rideId === tooShortRideId &&
    (snapshot?.stats.distanceM ?? 0) < MIN_SAVE_DISTANCE_M;
  const secondaryFinish = cancelMode ? (
    <Button
      variant="outlined"
      destructive
      size="xl"
      label={t('record.cancel')}
      onPress={() => {
        haptics.warning();
        setCancelVisible(true);
      }}
      disabled={busy}
      style={styles.flex}
    />
  ) : (
    <Button
      variant="outlined"
      size="xl"
      label={t('record.finish')}
      onPress={shownInterrupted ? handleRecoveryFinish : handleFinish}
      disabled={busy}
      style={styles.flex}
      testID="record-finish"
    />
  );

  let controls;
  if (permissionMissing) {
    controls = (
      <View style={styles.permission}>
        <View style={styles.permissionBody}>
          <Image source={illustration} style={styles.illustration} resizeMode="contain" />
          <View style={styles.permissionText}>
            <Text style={styles.permissionHeading}>{t('record.permission.heading')}</Text>
            <Text style={styles.permissionDescription}>{t('record.permission.description')}</Text>
          </View>
        </View>
        <View style={styles.permissionActions}>
          <Button
            label={
              access === 'blocked' ? t('record.permission.settings') : t('record.permission.allow')
            }
            onPress={handleAllowLocation}
          />
          <Button variant="text" label={t('record.permission.notNow')} onPress={goBack} />
        </View>
      </View>
    );
  } else if (shownInterrupted) {
    controls = (
      <>
        <Text style={styles.recoveryText}>{t('record.recovery.description')}</Text>
        {metrics}
        <View style={styles.actionsRow}>
          {secondaryFinish}
          <Button
            size="xl"
            label={t('record.resume')}
            onPress={async () => {
              haptics.press();
              await recording.restoreInterrupted();
              recording.resume();
            }}
            style={styles.flex}
          />
        </View>
        <Button
          variant="text"
          destructive
          label={t('record.delete')}
          onPress={() => setDeleteVisible(true)}
        />
      </>
    );
  } else if (active) {
    const paused = phase === 'paused';
    controls = (
      <>
        {metrics}
        {!paused && !fullScreen && !collapsed ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <RideTypeStrip
              label={t('record.rideType')}
              value={active.rideType}
              onChange={recording.setRideType}
            />
          </Animated.View>
        ) : null}
        <View style={styles.actionsRow}>
          {secondaryFinish}
          <Button
            size="xl"
            label={paused ? t('record.resume') : t('record.pause')}
            onPress={withHaptic(paused ? recording.resume : recording.pause, 'press')}
            style={styles.flex}
            testID={paused ? 'record-resume' : 'record-pause'}
          />
        </View>
        {note}
      </>
    );
  } else {
    controls = (
      <>
        {metrics}
        {fullScreen || collapsed ? null : (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <RideTypeStrip label={t('record.rideType')} value={rideType} onChange={setRideType} />
          </Animated.View>
        )}
        <Button
          size="xl"
          label={t('record.start')}
          onPress={() => handleStart()}
          loading={busy}
          disabled={access === 'unknown'}
          testID="record-start"
        />
        {note}
      </>
    );
  }

  // Grabber drag (`un0E9`): the panel follows the finger, then settles collapsed or expanded.
  const draggable = !fullScreen && !permissionMissing;
  const panelGesture = Gesture.Pan()
    .enabled(draggable)
    .activeOffsetY([-6, 6])
    .onUpdate((event) => {
      drag.value = Math.min(Math.max(event.translationY * 0.6, DRAG_MIN), DRAG_MAX);
    })
    .onEnd((event) => {
      const down = event.translationY > DRAG_THRESHOLD || event.velocityY > FLICK_VELOCITY;
      const up = event.translationY < -DRAG_THRESHOLD || event.velocityY < -FLICK_VELOCITY;
      if (down || up) {
        scheduleOnRN(setCollapsed, down);
      }
      drag.value = withSpring(0, PANEL_SPRING);
    });
  const panelDragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  const position = snapshot?.position ?? preview.position;
  const heading = snapshot?.headingDeg ?? preview.headingDeg;

  // "Konumum": back on the rider at once and following again. The live fix is used as is; only
  // before the first fix does it ask the system for one.
  const handleLocate = async () => {
    haptics.tap();
    setFollow(true);
    let to = position;
    if (!to && !isSimulatedNavigation) {
      const fix =
        (await Location.getLastKnownPositionAsync({ maxAge: LOCATE_MAX_AGE_MS }).catch(() => null)) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(
          () => null,
        ));
      to = fix ? [fix.coords.longitude, fix.coords.latitude] : null;
    }
    if (!to) {
      showToast({
        variant: 'failure',
        message: t('explore:map.locationUnavailable'),
        bottomOffset: panelHeight - insets.bottom + spacing.sm,
      });
      return;
    }
    setRecenter({ key: Date.now(), to });
  };

  return (
    <View style={styles.screen}>
      <RecordMapView
        position={position}
        headingDeg={heading}
        track={track}
        follow={follow}
        onUserGesture={() => setFollow(false)}
        recenter={recenter}
        mapStyle={mapStyle}
        weakSignal={autoPaused}
        detail={collapsed && !fullScreen}
        bottomInset={fullScreen ? 0 : panelHeight}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.topFade, { height: topOffset - RECORD_SHEET_TOP_GAP + TOP_FADE_HEIGHT }]}
      />

      <View style={[styles.topBar, { top: topOffset }]} pointerEvents="box-none">
        <MapActionButton
          icon={NavArrowDown}
          accessibilityLabel={t('record.closeSheet')}
          onPress={goBack}
        />
        <View style={styles.mapControls}>
          <MapActionButton
            icon={LayersIcon}
            accessibilityLabel={t('explore:map.layers')}
            selected={mapStyle === 'satellite'}
            disabled={!isNativeMapAvailable}
            onPress={() =>
              setMapStyle((current) => (current === 'satellite' ? 'default' : 'satellite'))
            }
          />
          <MapActionButton
            icon={NavigatorAlt}
            accessibilityLabel={t('explore:map.myLocation')}
            selected={follow}
            iconColor={follow ? colors.brand : colors.textPrimary}
            onPress={handleLocate}
            disabled={!isNativeMapAvailable}
          />
        </View>
      </View>

      {fullScreen ? null : (
        <GpsDevPanel style={[styles.devPanel, { top: topOffset + DEV_PANEL_OFFSET }]} />
      )}

      {/* The dock has no padding, so the banner (bottom 100%) sits 12 pt above the panel. */}
      <Animated.View
        layout={PANEL_LAYOUT}
        onLayout={(event) => setPanelHeight(Math.round(event.nativeEvent.layout.height))}
        style={[styles.dock, fullScreen && styles.dockFull, panelDragStyle]}>
        {banner && !fullScreen ? (
          <View style={styles.bannerSlot} pointerEvents="none">
            <MapStatusBanner tone={banner.tone} message={banner.message} busy={banner.busy} />
          </View>
        ) : null}
        <View
          style={[
            styles.panel,
            fullScreen && [styles.panelFull, { paddingTop: topOffset }],
            { paddingBottom: insets.bottom + spacing.lg },
          ]}>
          <GestureDetector gesture={panelGesture}>
            <View>
              {fullScreen ? null : (
                <Pressable
                  onPress={draggable ? () => setCollapsed((value) => !value) : undefined}
                  disabled={!draggable}
                  accessibilityRole="button"
                  accessibilityLabel={
                    collapsed ? t('record.panelExpand') : t('record.panelCollapse')
                  }
                  style={styles.grabberZone}>
                  <View style={styles.grabber} />
                </Pressable>
              )}
              <View style={styles.panelContent}>{header}</View>
            </View>
          </GestureDetector>
          <View
            style={[styles.panelContent, styles.controls, fullScreen && styles.panelContentFull]}>
            {controls}
          </View>
        </View>
      </Animated.View>

      <DialogModal
        visible={cancelVisible}
        onRequestClose={() => setCancelVisible(false)}
        status="error"
        title={t('record.cancelDialog.title')}
        description={t('record.cancelDialog.description', {
          distance: formatDistance(MIN_SAVE_DISTANCE_M / 1000, 1),
        })}
        actionsLayout="column"
        actions={[
          <Button
            key="cancel-ride"
            destructive
            label={t('record.cancelDialog.confirm')}
            onPress={confirmCancel}
          />,
          <Button
            key="keep"
            variant="text"
            label={t('record.cancelDialog.keep')}
            onPress={() => setCancelVisible(false)}
          />,
        ]}
      />

      <DialogModal
        visible={deleteVisible}
        onRequestClose={() => setDeleteVisible(false)}
        status="error"
        title={t('record.deleteDialog.title')}
        description={t('record.deleteDialog.description')}
        actionsLayout="column"
        actions={[
          <Button
            key="delete"
            destructive
            label={t('record.deleteDialog.confirm')}
            onPress={confirmDelete}
          />,
          <Button
            key="cancel"
            variant="text"
            label={t('record.deleteDialog.cancel')}
            onPress={() => setDeleteVisible(false)}
          />,
        ]}
      />
    </View>
  );
}

/** "Sürüş tipi" label and the tile strip, full width (the strip scrolls edge to edge). */
function RideTypeStrip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RideType;
  onChange: (type: RideType) => void;
}) {
  return (
    <View style={styles.typeStrip}>
      <Text style={styles.typeLabel}>{label}</Text>
      <RideTypeSelector value={value} onChange={onChange} />
    </View>
  );
}

function interruptedMetrics(ride: {
  stats: { distanceM: number; durationS: number; breakS: number };
}) {
  // An interrupted ride isn't moving.
  return { stats: ride.stats, speedMps: 0 };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapControls: {
    gap: spacing.md,
  },
  devPanel: {
    left: layout.screenGutter,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.mapTopFade}, ${colors.mapTopFadeEnd})`,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockFull: {
    top: 0,
  },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  panelFull: {
    flex: 1,
    borderRadius: 0,
  },
  bannerSlot: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    bottom: '100%',
    marginBottom: spacing.md,
  },
  // Full-width tap / drag strip above the title; the grabber itself is drawn 40 × 5.
  grabberZone: {
    height: GRABBER_TOP + GRABBER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  grabber: {
    width: 40,
    height: GRABBER_HEIGHT,
    borderRadius: 3,
    backgroundColor: colors.sheetGrabber,
  },
  panelContent: {
    gap: 20,
    paddingHorizontal: layout.screenGutter,
  },
  controls: {
    paddingTop: 20,
  },
  panelContentFull: {
    flex: 1,
    gap: spacing.lg,
  },
  header: {
    minHeight: EXPAND_BUTTON,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  expand: {
    width: EXPAND_BUTTON,
    height: EXPAND_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  typeStrip: {
    gap: 10,
    marginHorizontal: -layout.screenGutter,
  },
  typeLabel: {
    ...typography.captionMedium,
    lineHeight: 16,
    paddingHorizontal: layout.screenGutter,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  note: {
    ...typography.caption,
    lineHeight: 16,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  recoveryText: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  permission: {
    gap: spacing.md,
  },
  permissionBody: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  illustration: {
    width: 95,
    height: 86,
  },
  permissionText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  permissionHeading: {
    ...typography.bodyLargeSemibold,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  permissionDescription: {
    ...typography.body,
    lineHeight: 20,
    maxWidth: 300,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  permissionActions: {
    gap: spacing.xs,
  },
});
