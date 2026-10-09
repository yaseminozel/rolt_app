import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useActiveRide, type ActiveRecording } from '@/features/rides/RideRecordingProvider';
import { formatDistance, formatRideClock } from '@/i18n/format';
import { colors, fontFamily, spacing, typography } from '@/theme';

type RideStatus = 'recording' | 'weak' | 'paused';

const statusOf = (recording: ActiveRecording): RideStatus =>
  recording.snapshot.phase === 'paused' ? 'paused' : recording.snapshot.autoPaused ? 'weak' : 'recording';

const DOT_COLORS: Record<RideStatus, string> = {
  recording: colors.accent,
  weak: colors.leanWarn,
  paused: colors.textTertiary,
};

/**
 * Ongoing ride above the tab bar (iOS 26 `NativeTabs.BottomAccessory`, user decision
 * 2026-10-09): with the record sheet closed the ride carries on, and this shows it — status dot,
 * time and distance (JetBrains Mono like the record screen). Tapping reopens the sheet. The
 * system draws the glass; inline (tab bar minimised) shows the dot and the time only. The
 * accessory renders twice (one per placement), so everything comes from the recording context;
 * only this re-renders with the live numbers, not the tab bar.
 */
export function RideAccessory() {
  const recording = useActiveRide();
  if (!recording) {
    return null;
  }
  return <RideAccessoryContent recording={recording} />;
}

function RideAccessoryContent({ recording }: { recording: ActiveRecording }) {
  const { t } = useTranslation('rides');
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const status = statusOf(recording);
  const { distanceM, durationS } = recording.snapshot.stats;
  const time = formatRideClock(durationS);
  const distance = formatDistance(distanceM / 1000, 1);
  const label = t(`record.accessory.status.${status}`);

  return (
    <Pressable
      onPress={() => router.push('/record-ride')}
      accessibilityRole="button"
      accessibilityLabel={t('record.accessory.a11y', { status: label, time, distance })}
      style={({ pressed }) => [
        styles.row,
        placement === 'inline' && styles.rowInline,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.dot, { backgroundColor: DOT_COLORS[status] }]} />
      {placement === 'inline' ? (
        <Text style={styles.metric}>{time}</Text>
      ) : (
        <>
          <Text style={styles.status} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.metric}>{time}</Text>
          <Text style={[styles.metric, styles.distance]}>{distance}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowInline: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  status: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  metric: {
    ...typography.metric,
    color: colors.textPrimary,
  },
  distance: {
    color: colors.textSecondary,
  },
});
