import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Share, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import {
  useReport,
  useRiderRides,
  useSetRideLiked,
  useSetRideSaved,
} from '@/features/riders/queries';
import type { RideSummary } from '@/features/riders/types';
import { formatDateTime, formatDistance, formatDuration, formatSpeed } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, spacing } from '@/theme';

import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { openShareRide } from '@/features/rides/openShareRide';

import { RideActivityCard } from './RideActivityCard';

type RiderRidesFeedProps = {
  riderId: string;
  riderName: string;
  riderAvatar?: ImageSourcePropType;
  /** The rider's own profile: no report menu, and no empty state (the screen draws its own). */
  own?: boolean;
  /** Toast offset above the screen bottom (the tab bar or the safe area). */
  toastBottomOffset?: number;
  /**
   * Another rider's profile (13.03): community post cards with the rider's handle and bike;
   * the own profile keeps the ride activity cards.
   */
  community?: { handle: string; bike?: string; isFollowing: boolean };
};

/**
 * "Sürüşler" feed of a rider profile (01.8 `gKG8D`, 09.01 `Ct2Yd`): ride activity cards with
 * like, comment, save, share and, on another rider's rides, report. Account-only actions go
 * through `useRequireAccount`.
 */
export function RiderRidesFeed({
  riderId,
  riderName,
  riderAvatar,
  own = false,
  toastBottomOffset = spacing.lg,
  community,
}: RiderRidesFeedProps) {
  const { t } = useTranslation(['profile', 'common']);
  const requireAccount = useRequireAccount();
  const { showToast } = useToast();
  const ridesQuery = useRiderRides(riderId);
  const setLiked = useSetRideLiked();
  const setSaved = useSetRideSaved();
  const report = useReport();

  if (ridesQuery.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }
  const rides = ridesQuery.data ?? [];
  if (rides.length === 0) {
    return own ? null : (
      <EmptyState title={t('empty.rides.title')} description={t('empty.rides.description')} />
    );
  }

  const toggleLike = (ride: RideSummary) => {
    const liked = !ride.isLiked;
    requireAccount('likeRide', () => setLiked.mutate({ rideId: ride.id, liked }));
  };

  const toggleSave = (ride: RideSummary) => {
    const saved = !ride.isSaved;
    requireAccount('saveRide', () => {
      setSaved.mutate({ rideId: ride.id, saved });
      showToast(
        saved
          ? { variant: 'saved', message: t('activity.saved'), bottomOffset: toastBottomOffset }
          : {
              variant: 'removed',
              message: t('activity.removed'),
              actionLabel: t('common:actions.undo'),
              onActionPress: () => setSaved.mutate({ rideId: ride.id, saved: true }),
              bottomOffset: toastBottomOffset,
            },
      );
    });
  };

  // Comments have no screen yet; the gate still applies so guests see the sign-in prompt.
  const openComments = () => requireAccount('commentRide', () => undefined);

  const shareRide = (ride: RideSummary) => {
    // The own sample rides get the share templates (09.03); others' rides share as text.
    if (own) {
      openShareRide(ride.id, { riderId });
      return;
    }
    Share.share({
      message: t('share.rideMessage', {
        title: ride.title,
        distance: formatDistance(ride.distanceKm, 1),
        duration: formatDuration(ride.durationMinutes),
      }),
    });
  };

  const openRideMenu = (ride: RideSummary) => {
    showActionSheet({
      cancelLabel: t('menu.cancel'),
      options: [
        {
          label: t('menu.report'),
          onPress: () =>
            requireAccount('reportContent', () => {
              report.mutateAsync({ type: 'ride', rideId: ride.id }).then(() =>
                showToast({
                  variant: 'success',
                  message: t('report.done'),
                  bottomOffset: toastBottomOffset,
                }),
              );
            }),
        },
      ],
    });
  };

  return (
    <View style={styles.feed}>
      {rides.map((ride, index) => (
        <View key={ride.id} style={styles.feed}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {community ? (
            <CommunityPostCard
              post={{
                id: ride.id,
                author: { id: riderId, name: riderName, handle: community.handle, avatar: riderAvatar, bike: community.bike },
                createdAt: ride.startedAt,
                ride: {
                  title: ride.title,
                  description: ride.description,
                  rideType: ride.rideType,
                  distanceKm: ride.distanceKm,
                  durationMinutes: ride.durationMinutes,
                  averageSpeedKmh: ride.averageSpeedKmh,
                  curveCount: ride.curveCount,
                  mapImage: ride.mapImage,
                },
                photos: ride.photos,
                likeCount: ride.likeCount,
                commentCount: ride.commentCount,
                isLiked: ride.isLiked,
                isFollowingAuthor: community.isFollowing,
                audience: 'public',
              }}
              onAuthorPress={() => undefined}
              onLikePress={() => toggleLike(ride)}
              onCommentPress={openComments}
              onSharePress={() => shareRide(ride)}
            />
          ) : (
          <RideActivityCard
            riderName={riderName}
            riderAvatar={riderAvatar}
            date={formatDateTime(new Date(ride.startedAt))}
            title={ride.title}
            rideType={ride.rideType}
            metrics={{
              distance: formatDistance(ride.distanceKm, 1),
              duration: formatDuration(ride.durationMinutes),
              averageSpeed: formatSpeed(ride.averageSpeedKmh),
            }}
            mapImage={ride.mapImage}
            photos={ride.photos}
            likeCount={ride.likeCount}
            commentCount={ride.commentCount}
            saveCount={ride.saveCount}
            liked={ride.isLiked}
            saved={ride.isSaved}
            onLikePress={() => toggleLike(ride)}
            onCommentPress={openComments}
            onSavePress={() => toggleSave(ride)}
            onSharePress={() => shareRide(ride)}
            onMorePress={own ? undefined : () => openRideMenu(ride)}
          />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    gap: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
});
