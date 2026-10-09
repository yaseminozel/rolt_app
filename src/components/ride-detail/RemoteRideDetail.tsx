import { router } from 'expo-router';
import { MoreVert, NavArrowLeft, Play, ShareAndroid } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { FADED_ACTION_BAR_HEIGHT, FadedActionBar } from '@/components/layout/FadedActionBar';
import { MapActionButton } from '@/components/map/MapActionButton';
import { RideMapPreview } from '@/components/record/RideMapPreview';
import { DifficultyIcon, RoadIcon } from '@/components/route-detail/icons';
import { MetricsCard } from '@/components/route-detail/MetricsCard';
import { RouteAuthorRow } from '@/components/route-detail/RouteAuthorRow';
import { RouteFactsCard } from '@/components/route-detail/RouteFactsCard';
import { RouteNotesField } from '@/components/route-detail/RouteNotesField';
import { RoutePhotoStrip } from '@/components/route-detail/RoutePhotoStrip';
import type { BoxPadding } from '@/components/route-builder/routeProjection';
import { Button } from '@/components/ui/Button';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { useOwnRiderId } from '@/features/riders/ownRider';
import { useReport, useRideDetail } from '@/features/riders/queries';
import type { RideDetail } from '@/features/riders/types';
import { useRideActions } from '@/features/riders/useRideActions';
import { useRideEndpoints } from '@/features/rides/queries';
import { rideLink } from '@/features/rides/shareRide';
import { useRoute } from '@/features/routes/queries';
import {
  formatClockTime,
  formatDistance,
  formatNumber,
  formatRideClock,
  formatSpeed,
} from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, radius, spacing, typography } from '@/theme';

import { LeanAngleCard } from './LeanAngleCard';
import { RideEndpointsCard } from './RideEndpointsCard';
import { RideSocialBar } from './RideSocialBar';

/** Same frame as the own ride detail (09.06 `1005:37957`). */
const MAP_HEIGHT = 360;
const SHEET_OVERLAP = MAP_HEIGHT - 252;
const PLAY_BUTTON_TOP = 188;
const MAP_PADDING: BoxPadding = { top: 96, right: 72, bottom: SHEET_OVERLAP + 24, left: 32 };

/**
 * 09.06 Sürüş detayı for a ride that isn't on this device — another rider's ride (profile and
 * feed cards), a shared link, a saved ride — from the server, read-only: the shared trace (start
 * and finish cut by the rider's 10.05 setting) with replay, title and rider (opens the profile),
 * like / comment / save, the metrics, lean angle, start and finish, photos, details and notes,
 * then "Paylaş". No edit, options or delete; "…" reports someone else's ride. Hidden or deleted
 * rides show "not available" (the server doesn't tell which).
 */
export function RemoteRideDetail({ rideId }: { rideId: string }) {
  const { t } = useTranslation(['rides', 'common']);
  const insets = useSafeAreaInsets();
  const query = useRideDetail(rideId);
  const ride = query.data;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/discover'));

  const backButton = (
    <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
      <MapActionButton
        icon={NavArrowLeft}
        accessibilityLabel={t('common:actions.back')}
        onPress={goBack}
      />
    </View>
  );

  if (!ride) {
    return (
      <View style={styles.screen}>
        <View style={styles.state}>
          {query.isPending ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : query.isError ? (
            <EmptyState
              title={t('detail.loadFailed.title')}
              description={t('detail.loadFailed.description')}
              action={{ label: t('detail.loadFailed.retry'), onPress: () => query.refetch() }}
            />
          ) : (
            <EmptyState
              title={t('detail.unavailable.title')}
              description={t('detail.unavailable.description')}
            />
          )}
        </View>
        {backButton}
      </View>
    );
  }

  return <RideDetailContent ride={ride} goBack={goBack} />;
}

function RideDetailContent({ ride, goBack }: { ride: RideDetail; goBack: () => void }) {
  const { t } = useTranslation(['rides', 'routes', 'profile', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const requireAccount = useRequireAccount();
  const report = useReport();
  const viewerId = useOwnRiderId();
  const isOwn = viewerId !== undefined && viewerId === ride.author.id;
  const { toggleLike, toggleSave } = useRideActions();
  const { data: route, isFetched: routeFetched } = useRoute(ride.routeId);
  const { data: endpoints } = useRideEndpoints(
    { id: ride.id, routeId: ride.routeId, track: ride.preview },
    route,
    routeFetched,
  );
  const [replayToken, setReplayToken] = useState(0);
  const leftLean = ride.maxLeanLeftDeg ?? 0;
  const rightLean = ride.maxLeanRightDeg ?? 0;
  const hasLean = ride.maxLeanLeftDeg !== undefined || ride.maxLeanRightDeg !== undefined;
  const startedAt = new Date(ride.startedAt);
  const endedAt = new Date(ride.endedAt ?? startedAt.getTime() + ride.durationS * 1000);

  const metrics = [
    [
      {
        key: 'distance',
        value: formatDistance(ride.distanceKm, 1),
        label: t('summary.distance'),
      },
      { key: 'duration', value: formatRideClock(ride.durationS), label: t('summary.duration') },
      {
        key: 'averageSpeed',
        value: formatSpeed(ride.averageSpeedKmh),
        label: t('summary.averageSpeed'),
      },
    ],
    [
      { key: 'maxSpeed', value: formatSpeed(ride.maxSpeedKmh), label: t('summary.maxSpeed') },
      { key: 'curves', value: formatNumber(ride.curveCount ?? 0), label: t('summary.curves') },
      {
        key: 'maxLean',
        value: t('detail.degrees', {
          value: formatNumber(Math.round(Math.max(leftLean, rightLean))),
        }),
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

  const share = () =>
    Share.share({
      message: t('share.message', {
        title: ride.title,
        distance: formatDistance(ride.distanceKm, 1),
        duration: formatRideClock(ride.durationS),
        link: rideLink(ride.id),
      }),
    }).catch(() => undefined);

  const openMenu = () =>
    showActionSheet({
      cancelLabel: t('profile:menu.cancel'),
      options: [
        {
          label: t('profile:menu.report'),
          onPress: () =>
            requireAccount('reportContent', () => {
              report
                .mutateAsync({ type: 'ride', rideId: ride.id })
                .then(() => showToast({ variant: 'success', message: t('profile:report.done') }))
                .catch(() => undefined);
            }),
        },
      ],
    });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: FADED_ACTION_BAR_HEIGHT + insets.bottom + spacing.xxl,
        }}>
        <RideMapPreview
          track={ride.preview}
          padding={MAP_PADDING}
          replayToken={replayToken}
          style={styles.map}
        />
        {ride.preview.length > 0 ? (
          <MapActionButton
            icon={Play}
            size="controlLarge"
            accessibilityLabel={t('detail.replay')}
            onPress={() => setReplayToken((token) => token + 1)}
            style={styles.playButton}
          />
        ) : null}
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {ride.title}
            </Text>
            <RouteAuthorRow
              author={{ id: ride.author.id, name: ride.author.name, avatar: ride.author.avatar }}
              publishedAt={ride.startedAt}
              onPress={
                isOwn
                  ? undefined
                  : () => router.push({ pathname: '/rider/[id]', params: { id: ride.author.id } })
              }
            />
            <RideSocialBar
              likeCount={ride.likeCount}
              commentCount={ride.commentCount}
              liked={ride.isLiked}
              onLikePress={() => toggleLike(ride)}
              onCommentPress={() =>
                router.push({ pathname: '/rides/[rideId]/comments', params: { rideId: ride.id } })
              }
              save={{ count: ride.saveCount, saved: ride.isSaved, onPress: () => toggleSave(ride) }}
            />
          </View>

          <MetricsCard rows={metrics} />

          {hasLean ? <LeanAngleCard leftDeg={leftLean} rightDeg={rightLean} /> : null}

          <RideEndpointsCard
            start={{ name: endpoints?.start, time: formatClockTime(startedAt) }}
            end={{ name: endpoints?.end, time: formatClockTime(endedAt) }}
          />

          {ride.photos.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('detail.photos')}
              </Text>
              <RoutePhotoStrip photos={ride.photos} />
            </View>
          ) : null}

          <View style={styles.facts}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('detail.details')}
            </Text>
            <RouteFactsCard facts={facts} />
          </View>

          {ride.description ? (
            <RouteNotesField label={t('detail.notes')} notes={ride.description} />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top }]} pointerEvents="box-none">
        <MapActionButton
          icon={NavArrowLeft}
          accessibilityLabel={t('common:actions.back')}
          onPress={goBack}
        />
        {isOwn ? null : (
          <MapActionButton
            icon={MoreVert}
            accessibilityLabel={t('profile:activity.more')}
            onPress={openMenu}
          />
        )}
      </View>

      <FadedActionBar style={styles.actionBar}>
        <Button icon={ShareAndroid} label={t('detail.share')} onPress={share} style={styles.flex} />
      </FadedActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
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
