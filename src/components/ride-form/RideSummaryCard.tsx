import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { RideMapPreview } from '@/components/record/RideMapPreview';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import type { RideRecord } from '@/features/rides/types';
import { formatDistance, formatRideClock, formatSpeed } from '@/i18n/format';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

const CARD_HEIGHT = 168;
const PILL_INSET = 12;
/** Keeps the track clear of the metrics pill along the bottom. */
const TRACK_PADDING: BoxPadding = { top: 24, right: 28, bottom: 76, left: 28 };

export const averageSpeedKmh = (ride: Pick<RideRecord, 'stats'>) => {
  const ridingS = Math.max(ride.stats.durationS - ride.stats.breakS, 0);
  return ridingS > 0 ? (ride.stats.distanceM / ridingS) * 3.6 : 0;
};

/**
 * "Sürüş özeti" on the save and edit forms (08.05, 09.07): the ride on a map picture with a
 * floating pill of distance · duration · average speed.
 */
export function RideSummaryCard({ ride }: { ride: RideRecord }) {
  const { t } = useTranslation('rides');
  const metrics = [
    {
      key: 'distance',
      value: formatDistance(ride.stats.distanceM / 1000, 1),
      label: t('summary.distance'),
    },
    { key: 'duration', value: formatRideClock(ride.stats.durationS), label: t('summary.duration') },
    { key: 'speed', value: formatSpeed(averageSpeedKmh(ride)), label: t('summary.averageSpeed') },
  ];

  return (
    <RideMapPreview
      track={ride.track}
      padding={TRACK_PADDING}
      style={styles.card}
      overlay={
        <View style={styles.pill}>
          {metrics.map((metric, index) => (
            <Fragment key={metric.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View
                style={styles.metric}
                accessible
                accessibilityLabel={`${metric.label}: ${metric.value}`}>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                  {metric.value}
                </Text>
                <Text style={styles.label} numberOfLines={1}>
                  {metric.label}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.media,
  },
  pill: {
    position: 'absolute',
    left: PILL_INSET,
    right: PILL_INSET,
    bottom: PILL_INSET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapPill,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  value: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
