import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { Collapse, Expand, MapsArrow, NavArrowLeft } from 'iconoir-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LayersIcon } from '@/components/explore/LayersIcon';
import { useHiddenTabBar } from '@/components/layout/TabBarVisibility';
import { DialogModal } from '@/components/feedback/DialogModal';
import { isNativeMapAvailable } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import type { MapStyle } from '@/components/map/mapStyles';
import { MapStatusBanner, type MapStatusBannerTone } from '@/components/record/MapStatusBanner';
import { RecordMapView } from '@/components/record/RecordMapView';
import { RecordMetrics } from '@/components/record/RecordMetrics';
import { RideTypeSelector } from '@/components/ride/RideTypeSelector';
import { Button } from '@/components/ui/Button';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { wasBackgroundPromptShown } from '@/features/navigation/backgroundPrompt';
import { isSimulatedNavigation } from '@/features/navigation/location';
import { MIN_SAVE_DISTANCE_M, useRideRecording } from '@/features/rides/RideRecordingProvider';
import type { RideType } from '@/features/rides/rideTypes';
import { formatDistance } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';
import { calibrationFlow, usePendingCalibrationStart } from '@/features/lean/calibrationFlow';
import { leanCalibration } from '@/features/lean/leanCalibration';
import { isLeanSensorAvailable } from '@/features/lean/leanSensor';

const illustration = require('../../../../assets/images/location-off-illustration.png');

/** "GPS hazır" stays this long after the first usable fix (08.01 `WwqPE`). */
const READY_BANNER_MS = 3_000;
/** "Sürüş çok kısa" (08.04) disappears after this long. */
const TOO_SHORT_BANNER_MS = 4_000;
/** Timed banners are checked this often. */
const BANNER_TICK_MS = 500;
const EXPAND_BUTTON = 36;

type LocationAccess = 'unknown' | 'granted' | 'askable' | 'blocked';

/**
 * 08.01–08.04 Kaydet (Pencil `PQYeR` hazır, `G7kHB` / `WwqPE` GPS, `QA0eS` konum izni yok,
 * `Ui4xO` GPS zayıf, `FJFkh` duraklatıldı, `CYh2I` tam ekran, `dR5dJ` kurtarma, `gyoyU` çok
 * kısa): the map with the rider and a fixed controls panel. The recording itself lives in
 * `RideRecordingProvider`, so it keeps going on other tabs; "Bitir" hands the ride to the save
 * form (08.05).
 */
export default function RecordScreen() {
  const { t } = useTranslation(['rides', 'common', 'explore']);
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const recording = useRideRecording();
  useHiddenTabBar();
  const { active, interrupted, preview, startPreview } = recording;

  const [rideType, setRideType] = useState<RideType>('city');
  const [access, setAccess] = useState<LocationAccess>(
    isSimulatedNavigation ? 'granted' : 'unknown',
  );
  const [fullScreen, setFullScreen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const now = useNow(BANNER_TICK_MS);
  const [tooShortUntil, setTooShortUntil] = useState(0);
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

  const handleStart = () =>
    requireAccount('saveRide', async () => {
      if (!isSimulatedNavigation) {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (!foreground.granted) {
          await readLocationAccess();
          return;
        }
        // 08.00: the first start on a phone with motion sensors calibrates the lean angle.
        if (
          !leanCalibration.get() &&
          !leanCalibration.wasSkipped() &&
          (await isLeanSensorAvailable())
        ) {
          router.push({ pathname: '/calibrate-lean', params: { then: 'record' } });
          return;
        }
        const background = await Location.getBackgroundPermissionsAsync();
        if (!background.granted && background.canAskAgain && !(await wasBackgroundPromptShown())) {
          pendingStart.current = true;
          router.push('/record/background-permission');
          return;
        }
      }
      await beginRecording();
    });

  useEffect(() => {
    if (calibrationStart && calibrationFlow.takeStart()) {
      handleStart();
    }
    // `handleStart` changes every render; the start runs once per hand-off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrationStart]);

  const handleFinish = async () => {
    setBusy(true);
    try {
      const result = await recording.finish();
      if (result.kind === 'tooShort') {
        setTooShortUntil(Date.now() + TOO_SHORT_BANNER_MS);
        return;
      }
      setFullScreen(false);
      router.push({ pathname: '/rides/[rideId]/save', params: { rideId: result.rideId } });
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
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/discover');
    }
  };

  const snapshot = active?.snapshot;
  const phase = snapshot?.phase;
  const autoPaused = snapshot?.autoPaused === true;
  const shownInterrupted = !active ? interrupted : null;
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
      averageSpeedMps={metricsSource?.averageSpeedMps ?? 0}
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

  const note = (
    <Text style={styles.note}>
      {active && autoPaused ? t('record.weakNote') : t('record.offlineNote')}
    </Text>
  );

  const secondaryFinish = (
    <Button
      variant="outlined"
      size="xl"
      label={t('record.finish')}
      onPress={shownInterrupted ? handleRecoveryFinish : handleFinish}
      disabled={busy}
      style={styles.flex}
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
        {!paused && !fullScreen ? (
          <RideTypeStrip
            label={t('record.rideType')}
            value={active.rideType}
            onChange={recording.setRideType}
          />
        ) : null}
        <View style={styles.actionsRow}>
          {secondaryFinish}
          <Button
            size="xl"
            label={paused ? t('record.resume') : t('record.pause')}
            onPress={paused ? recording.resume : recording.pause}
            style={styles.flex}
          />
        </View>
        {note}
      </>
    );
  } else {
    controls = (
      <>
        {metrics}
        {fullScreen ? null : (
          <RideTypeStrip label={t('record.rideType')} value={rideType} onChange={setRideType} />
        )}
        <Button
          size="xl"
          label={t('record.start')}
          onPress={handleStart}
          loading={busy}
          disabled={access === 'unknown'}
        />
        {note}
      </>
    );
  }

  const position = snapshot?.position ?? preview.position;
  const heading = snapshot?.headingDeg ?? preview.headingDeg;

  return (
    <View style={styles.screen}>
      <RecordMapView
        position={position}
        headingDeg={heading}
        track={snapshot?.track ?? []}
        follow={follow}
        onUserGesture={() => setFollow(false)}
        mapStyle={mapStyle}
        weakSignal={autoPaused}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton
          icon={NavArrowLeft}
          accessibilityLabel={t('common:actions.back')}
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
            icon={MapsArrow}
            accessibilityLabel={t('explore:map.locateMe')}
            onPress={() => setFollow(true)}
            disabled={!isNativeMapAvailable}
          />
        </View>
      </View>

      <View
        style={[
          styles.panel,
          fullScreen ? [styles.panelFull, { paddingTop: insets.top + spacing.lg }] : null,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}>
        {banner && !fullScreen ? (
          <View style={styles.bannerSlot} pointerEvents="none">
            <MapStatusBanner tone={banner.tone} message={banner.message} busy={banner.busy} />
          </View>
        ) : null}
        {fullScreen ? null : <View style={styles.handle} />}
        <View style={[styles.panelContent, fullScreen && styles.panelContentFull]}>
          {header}
          {controls}
        </View>
      </View>

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
  const ridingS = Math.max(ride.stats.durationS - ride.stats.breakS, 0);
  return { stats: ride.stats, averageSpeedMps: ridingS > 0 ? ride.stats.distanceM / ridingS : 0 };
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
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  panelFull: {
    top: 0,
    borderRadius: 0,
  },
  bannerSlot: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    bottom: '100%',
    marginBottom: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  panelContent: {
    gap: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
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
