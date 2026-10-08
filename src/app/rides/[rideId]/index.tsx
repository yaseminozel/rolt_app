import { router, useLocalSearchParams } from 'expo-router';
import { MoreVert, NavArrowLeft, Play, ShareAndroid } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { FADED_ACTION_BAR_HEIGHT, FadedActionBar } from '@/components/layout/FadedActionBar';
import { MapActionButton } from '@/components/map/MapActionButton';
import { RideMapPreview } from '@/components/record/RideMapPreview';
import { LeanAngleCard } from '@/components/ride-detail/LeanAngleCard';
import { RideEndpointsCard } from '@/components/ride-detail/RideEndpointsCard';
import { averageSpeedKmh } from '@/components/ride-form/RideSummaryCard';
import { DifficultyIcon, RoadIcon } from '@/components/route-detail/icons';
import { MetricsCard } from '@/components/route-detail/MetricsCard';
import { RouteAuthorRow } from '@/components/route-detail/RouteAuthorRow';
import { RouteFactsCard } from '@/components/route-detail/RouteFactsCard';
import { RouteNotesField } from '@/components/route-detail/RouteNotesField';
import { RoutePhotoStrip } from '@/components/route-detail/RoutePhotoStrip';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import { Button } from '@/components/ui/Button';
import { useOwnRider } from '@/features/riders/ownRider';
import { useDeleteRide, useRideEndpoints } from '@/features/rides/queries';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { rideTitle } from '@/features/rides/rideTitle';
import { shareRide } from '@/features/rides/shareRide';
import { useRoute } from '@/features/routes/queries';
import { formatClockTime, formatDistance, formatNumber, formatRideClock, formatSpeed } from '@/i18n/format';
import { colors, layout, radius, spacing, typography } from '@/theme';

const MAP_HEIGHT = 360;
/** The sheet starts at 252 pt over a 360 pt map (09.06 `1005:37957`). */
const SHEET_OVERLAP = MAP_HEIGHT - 252;
/** "▷" sits 16 pt above the sheet (y 188). */
const PLAY_BUTTON_TOP = 188;
const MAP_PADDING: BoxPadding = { top: 96, right: 72, bottom: SHEET_OVERLAP + 24, left: 32 };

/**
 * 09.06 Sürüş detayı — Kendi sürüşüm (Figma `1005:37957`): the ride on a map picture with a
 * replay button, title and rider, six metrics (max lean instead of breaks), the lean angle
 * gauge, start and finish, photos, details and notes, then "Paylaş" (and "Rotayı tekrar sür"
 * for rides recorded on a route, Ride ≠ Route). "…" opens the ride options; deleting asks first
 * and returns to the profile.
 */
export default function RideDetailScreen() {
  const { t } = useTranslation(['rides', 'routes', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { confirm } = useLocalSearchParams<{ confirm?: 'delete' }>();
  const { ride } = useRideForm();
  const { data: rider } = useOwnRider();
  const deleteRide = useDeleteRide();
  const { data: route, isFetched: routeFetched } = useRoute(ride.routeId);
  const { data: endpoints } = useRideEndpoints(ride, route, routeFetched);
  const [replayToken, setReplayToken] = useState(0);
  const leftLean = ride.stats.maxLeanLeftDeg ?? 0;
  const rightLean = ride.stats.maxLeanRightDeg ?? 0;

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
      {
        key: 'maxLean',
        value: t('detail.degrees', { value: formatNumber(Math.round(Math.max(leftLean, rightLean))) }),
        label: t('summary.maxLean'),
      },
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
        <RideMapPreview
          track={ride.track}
          padding={MAP_PADDING}
          replayToken={replayToken}
          style={styles.map}
        />
        <MapActionButton
          icon={Play}
          size="controlLarge"
          accessibilityLabel={t('detail.replay')}
          onPress={() => setReplayToken((token) => token + 1)}
          style={styles.playButton}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {rideTitle(ride)}
            </Text>
            {rider ? (
              <RouteAuthorRow
                author={{ id: rider.id, name: rider.name, avatar: rider.avatar }}
                publishedAt={new Date(ride.startedAt).toISOString()}
              />
            ) : null}
          </View>

          <MetricsCard rows={metrics} />

          <LeanAngleCard leftDeg={leftLean} rightDeg={rightLean} />

          <RideEndpointsCard
            start={{ name: endpoints?.start, time: formatClockTime(new Date(ride.startedAt)) }}
            end={{
              name: endpoints?.end,
              time: formatClockTime(new Date(ride.endedAt ?? ride.updatedAt)),
            }}
          />

          {photos.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('detail.photos')}
              </Text>
              <RoutePhotoStrip photos={photos} />
            </View>
          ) : null}

          <View style={styles.facts}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('detail.details')}
            </Text>
            <RouteFactsCard facts={facts} />
          </View>

          {ride.notes.trim() ? <RouteNotesField label={t('detail.notes')} notes={ride.notes} /> : null}
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
          variant={ride.routeId ? 'outlined' : 'contained'}
          icon={ShareAndroid}
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
  facts: {
    gap: spacing.xs,
  },
  playButton: {
    position: 'absolute',
    top: PLAY_BUTTON_TOP,
    right: layout.screenGutter,
  },
  title: {
    ...typography.titleSmall,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyLargeSemibold,
    lineHeight: 24,
    color: colors.textPrimary,
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
