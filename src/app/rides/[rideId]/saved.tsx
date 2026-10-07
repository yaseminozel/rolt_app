import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusIcon } from '@/components/feedback/StatusIcon';
import { useToast } from '@/components/feedback/ToastProvider';
import { RideMapPreview } from '@/components/record/RideMapPreview';
import { averageSpeedKmh } from '@/components/ride-form/RideSummaryCard';
import { ShareTargets } from '@/components/ride-form/ShareTargets';
import { MetricsCard } from '@/components/route-detail/MetricsCard';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import { Button } from '@/components/ui/Button';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { shareRide, type ShareTarget } from '@/features/rides/shareRide';
import { formatDistance, formatRideClock, formatSpeed } from '@/i18n/format';
import { colors, fontFamily, layout, radius, shadows, spacing, typography } from '@/theme';

/** The track stays in the open map above the panel. */
const MAP_PADDING: BoxPadding = { top: 80, right: 40, bottom: 470, left: 40 };

/**
 * 08.11 Sürüş kaydedildi — Paylaş (Pencil `f78naq`): shown only once the ride is stored on the
 * device (P0). Share targets send text and link; "Paylaşım görseli oluştur" comes with the
 * share templates (decision 2026-10-07), so it isn't shown yet. Back goes to Record.
 */
export default function RideSavedScreen() {
  const { t } = useTranslation('rides');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { ride } = useRideForm();

  const handleShare = async (target: ShareTarget) => {
    const result = await shareRide(ride, target).catch(() => null);
    if (result === 'copied') {
      showToast({ variant: 'success', message: t('saved.linkCopied'), bottomOffset: 120 });
    }
  };

  return (
    <View style={styles.screen}>
      <RideMapPreview track={ride.track} padding={MAP_PADDING} style={StyleSheet.absoluteFill} />
      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          <StatusIcon status="success" />
          <Text style={styles.title} accessibilityRole="header">
            {t('saved.title')}
          </Text>
          <Text style={styles.description}>
            {t('saved.description', { audience: t(`visibility.audience.${ride.visibility}`) })}
          </Text>
        </View>
        <MetricsCard
          rows={[
            [
              {
                key: 'distance',
                value: formatDistance(ride.stats.distanceM / 1000, 1),
                label: t('summary.distance'),
              },
              {
                key: 'duration',
                value: formatRideClock(ride.stats.durationS),
                label: t('summary.duration'),
              },
              {
                key: 'speed',
                value: formatSpeed(averageSpeedKmh(ride)),
                label: t('summary.averageSpeed'),
              },
            ],
          ]}
        />
        <View style={styles.share}>
          <Text style={styles.shareTitle} accessibilityRole="header">
            {t('saved.shareTitle')}
          </Text>
          <ShareTargets onShare={handleShare} />
        </View>
        <Button
          variant="text"
          size="lg"
          label={t('saved.viewRide')}
          onPress={() =>
            router.replace({ pathname: '/rides/[rideId]', params: { rideId: ride.id } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceMuted,
  },
  panel: {
    gap: 20,
    paddingHorizontal: layout.screenGutter,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    ...typography.titleSmall,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  share: {
    gap: spacing.md,
  },
  shareTitle: {
    ...typography.bodySemibold,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
