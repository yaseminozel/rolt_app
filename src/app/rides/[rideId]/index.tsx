import { router, useLocalSearchParams } from 'expo-router';
import { Globe, Group, Lock, MoreVert, NavArrowLeft, ShareIos } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { FADED_ACTION_BAR_HEIGHT, FadedActionBar } from '@/components/layout/FadedActionBar';
import { MapActionButton } from '@/components/map/MapActionButton';
import { RideMapPreview } from '@/components/record/RideMapPreview';
import { averageSpeedKmh } from '@/components/ride-form/RideSummaryCard';
import { DifficultyIcon, RoadIcon } from '@/components/route-detail/icons';
import { MetricsCard } from '@/components/route-detail/MetricsCard';
import { RouteAuthorRow } from '@/components/route-detail/RouteAuthorRow';
import { RouteFactsCard } from '@/components/route-detail/RouteFactsCard';
import { RoutePhotoStrip } from '@/components/route-detail/RoutePhotoStrip';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useOwnRider } from '@/features/riders/ownRider';
import { useDeleteRide } from '@/features/rides/queries';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { rideTitle } from '@/features/rides/rideTitle';
import { shareRide } from '@/features/rides/shareRide';
import { formatDistance, formatNumber, formatRideClock, formatSpeed } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const MAP_HEIGHT = 360;
/** The sheet overlaps the map by its corner radius. */
const SHEET_OVERLAP = spacing.xxl;
const MAP_PADDING: BoxPadding = { top: 96, right: 32, bottom: 56, left: 32 };
const VISIBILITY_ICONS = { public: Globe, followers: Group, private: Lock } as const;

/**
 * 09.06 Sürüş detayı — Kendi sürüşüm (Pencil `mhunR`): the ride on a map picture, title, rider
 * and visibility, six metrics, notes, photos and details, then "Paylaş" and "Rotayı tekrar sür"
 * (only for rides recorded on a route, Ride ≠ Route). "…" opens the ride options (09.06
 * `W8Hilq`); deleting asks first (`drXDa`) and returns to the profile.
 */
export default function RideDetailScreen() {
  const { t } = useTranslation(['rides', 'routes', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { confirm } = useLocalSearchParams<{ confirm?: 'delete' }>();
  const { ride } = useRideForm();
  const { data: rider } = useOwnRider();
  const deleteRide = useDeleteRide();

  const metrics = [
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
        key: 'averageSpeed',
        value: formatSpeed(averageSpeedKmh(ride)),
        label: t('summary.averageSpeed'),
      },
    ],
    [
      {
        key: 'maxSpeed',
        value: formatSpeed(ride.stats.maxSpeedMps * 3.6),
        label: t('summary.maxSpeed'),
      },
      { key: 'curves', value: formatNumber(ride.stats.curveCount), label: t('summary.curves') },
      { key: 'breaks', value: formatNumber(ride.stats.breakCount), label: t('summary.breaks') },
    ],
  ];
  const facts = [
    {
      key: 'difficulty',
      icon: DifficultyIcon,
      label: t('form.details.difficulty'),
      value: t(`routes:difficulty.${ride.difficulty}`),
    },
    {
      key: 'surface',
      icon: RoadIcon,
      label: t('form.details.surface'),
      value: t(`routes:surface.${ride.surface}`),
    },
  ];
  const photos = ride.photos
    .filter((photo) => photo.status === 'uploaded')
    .map((photo) => ({ uri: photo.uri }));

  const closeDeleteDialog = () => router.setParams({ confirm: undefined });

  const confirmDelete = () => {
    const id = ride.id;
    closeDeleteDialog();
    router.dismissAll();
    router.navigate('/profile');
    deleteRide.mutate(id);
    showToast({ variant: 'success', message: t('form.deleted') });
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/profile'));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: FADED_ACTION_BAR_HEIGHT + insets.bottom + spacing.xxl,
        }}>
        <RideMapPreview track={ride.track} padding={MAP_PADDING} style={styles.map} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {rideTitle(ride)}
            </Text>
            <View style={styles.meta}>
              {rider ? (
                <RouteAuthorRow
                  author={{ id: rider.id, name: rider.name, avatar: rider.avatar }}
                  publishedAt={new Date(ride.startedAt).toISOString()}
                />
              ) : (
                <View />
              )}
              <Badge
                tone="neutral"
                size="small"
                icon={VISIBILITY_ICONS[ride.visibility]}
                label={t(`visibility.${ride.visibility}`)}
              />
            </View>
          </View>

          <MetricsCard rows={metrics} />

          {ride.notes.trim() ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('detail.notes')}
              </Text>
              <Text style={styles.notes}>{ride.notes}</Text>
            </View>
          ) : null}

          {photos.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('detail.photos')}
              </Text>
              <RoutePhotoStrip photos={photos} />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('detail.details')}
            </Text>
            <RouteFactsCard facts={facts} />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton
          icon={NavArrowLeft}
          accessibilityLabel={t('common:actions.back')}
          onPress={goBack}
        />
        <MapActionButton
          icon={MoreVert}
          accessibilityLabel={t('detail.options')}
          onPress={() =>
            router.push({ pathname: '/rides/[rideId]/options', params: { rideId: ride.id } })
          }
        />
      </View>

      <FadedActionBar style={styles.actionBar}>
        <Button
          variant="outlined"
          icon={ShareIos}
          label={t('detail.share')}
          onPress={() => shareRide(ride, 'other').catch(() => undefined)}
          style={styles.flex}
        />
        {ride.routeId ? (
          <Button
            label={t('detail.rideAgain')}
            onPress={() =>
              router.push({
                pathname: '/ride/[routeId]/prepare',
                params: { routeId: ride.routeId! },
              })
            }
            style={styles.flex}
          />
        ) : null}
      </FadedActionBar>

      <DialogModal
        visible={confirm === 'delete'}
        onRequestClose={closeDeleteDialog}
        status="error"
        title={t('record.deleteDialog.title')}
        description={t('detail.deleteDescription')}
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
            onPress={closeDeleteDialog}
          />,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  map: {
    height: MAP_HEIGHT,
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    gap: 20,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
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
    gap: spacing.lg,
  },
  title: {
    ...typography.titleSmall,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyLargeSemibold,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  notes: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  topBar: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
