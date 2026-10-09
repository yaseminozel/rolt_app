import { i18n } from '@/i18n';
import { formatDistance, formatSpeed } from '@/i18n/format';
import type { NavigationSnapshot } from '@/features/navigation/navigationTracker';
import type { RecorderSnapshot } from '@/features/rides/rideRecorder';
import { colors } from '@/theme';

import type { RideActivityProps, RideActivityStatus } from './rideActivityTypes';

const shared = () => ({
  distanceLabel: i18n.t('rides:record.liveActivity.distance'),
  durationLabel: i18n.t('rides:record.liveActivity.duration'),
  speedLabel: i18n.t('rides:record.liveActivity.averageSpeed'),
  accent: colors.accent,
  warning: colors.leanWarn,
  muted: colors.textTertiary,
});

/** Free ride (08.02): the clock is the counted riding time, so it stops while paused. */
export function recordingActivityProps(snapshot: RecorderSnapshot, now: number): RideActivityProps {
  const status: RideActivityStatus =
    snapshot.phase === 'paused' ? 'paused' : snapshot.autoPaused ? 'weak' : 'recording';
  return {
    ...shared(),
    status,
    statusLabel: i18n.t(`rides:record.accessory.status.${status}`),
    title: i18n.t('rides:record.liveActivity.title'),
    timerStartMs: now - snapshot.stats.durationS * 1000,
    timerRunning: status === 'recording',
    pausedAtMs: now,
    distance: formatDistance(snapshot.stats.distanceM / 1000, 1),
    speed: formatSpeed(snapshot.averageSpeedMps * 3.6),
    instruction: '',
    instructionDetail: '',
  };
}

/** Route ride (06.06): the clock is the elapsed time since the start, with the next maneuver. */
export function navigationActivityProps(
  snapshot: NavigationSnapshot,
  guidance: { title: string; subtitle: string },
  routeName: string,
): RideActivityProps {
  const status: RideActivityStatus = snapshot.gps === 'ok' ? 'recording' : 'weak';
  const { ride } = snapshot;
  return {
    ...shared(),
    status,
    statusLabel: i18n.t(
      status === 'weak' ? 'ride:navigation.liveActivity.weak' : 'ride:navigation.liveActivity.status',
    ),
    title: routeName,
    timerStartMs: ride.startedAt,
    timerRunning: true,
    pausedAtMs: ride.startedAt,
    distance: formatDistance(ride.distanceM / 1000, 1),
    speed: formatSpeed(ride.movingS > 0 ? (ride.distanceM / ride.movingS) * 3.6 : 0),
    instruction: guidance.title,
    instructionDetail: guidance.subtitle,
  };
}
