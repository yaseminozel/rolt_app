import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Check, Garage, Motorcycle, MoreHoriz, PathArrow, ShareIos } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { GarageBikeRow } from '@/components/profile/GarageBikeRow';
import { ProfileHeader, type ProfileHeaderBike } from '@/components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTab } from '@/components/profile/ProfileTabs';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { RideActivityCard } from '@/components/profile/RideActivityCard';
import { RiderMatchNote } from '@/components/profile/RiderMatchNote';
import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam } from '@/features/auth/credentials';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import {
  useBlockRider,
  useReport,
  useRider,
  useRiderMatch,
  useRiderRides,
  useRiderRoutes,
  useSetFollowing,
  useSetRideLiked,
  useSetRideSaved,
} from '@/features/riders/queries';
import type { RideSummary, Rider, RiderBike } from '@/features/riders/types';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDateTime, formatDistance, formatDuration, formatNumber, formatSpeed } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, spacing } from '@/theme';

type ProfileSection = 'rides' | 'routes' | 'garage';

/** No tab bar on this root-stack screen, so toasts sit just above the bottom safe area. */
const TOAST_BOTTOM_OFFSET = spacing.lg;
/** Design: identity block starts 14 pt under the top bar (y 99 → 113). */
const HEADER_TOP_PADDING = 14;

/**
 * 01.8 Discover / Sürücü profili (başkası) — Pencil `gKG8D`. Opened from the route detail's
 * author row; a root-stack screen without the tab bar (the design draws the tab bar, but
 * pushing into the Discover tab's stack would break back navigation from the route detail).
 * Follow, like, comment, save, report and block are account-only (`useRequireAccount`).
 */
export default function RiderProfileScreen() {
  const { t } = useTranslation('profile');
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const riderId = firstParam(params.id);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const requireAccount = useRequireAccount();
  const { showToast } = useToast();
  const riderQuery = useRider(riderId);
  const report = useReport();
  const blockRider = useBlockRider();
  const rider = riderQuery.data;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/discover'));

  const shareProfile = (profile: Rider) => {
    Share.share({ message: t('share.message', { name: profile.name, handle: profile.handle }) });
  };

  const confirmBlock = (profile: Rider) => {
    Alert.alert(t('block.title', { name: profile.name }), t('block.message'), [
      { text: t('menu.cancel'), style: 'cancel' },
      {
        text: t('block.confirm'),
        style: 'destructive',
        onPress: () => {
          blockRider.mutateAsync(profile.id).then(() =>
            showToast({
              variant: 'success',
              message: t('block.done', { name: profile.name }),
              bottomOffset: TOAST_BOTTOM_OFFSET,
            }),
          );
          // A guest's replayed block may run after this screen left the stack.
          if (navigation.isFocused()) {
            goBack();
          }
        },
      },
    ]);
  };

  const openMenu = (profile: Rider) => {
    showActionSheet({
      cancelLabel: t('menu.cancel'),
      options: [
        {
          label: t('menu.report'),
          onPress: () =>
            requireAccount('reportContent', () => {
              report.mutateAsync({ type: 'rider', riderId: profile.id }).then(() =>
                showToast({ variant: 'success', message: t('report.done'), bottomOffset: TOAST_BOTTOM_OFFSET }),
              );
            }),
        },
        {
          label: t('menu.block'),
          destructive: true,
          onPress: () => requireAccount('blockRider', () => confirmBlock(profile)),
        },
      ],
    });
  };

  return (
    <View style={styles.screen}>
      <ProfileTopBar
        onBack={goBack}
        actions={
          rider
            ? [
                { icon: ShareIos, accessibilityLabel: t('actions.share'), onPress: () => shareProfile(rider) },
                { icon: MoreHoriz, accessibilityLabel: t('actions.more'), onPress: () => openMenu(rider) },
              ]
            : []
        }
      />
      {riderQuery.isPending && riderId ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : riderQuery.isError ? (
        <View style={styles.centered}>
          <EmptyState
            title={t('error.title')}
            description={t('error.description')}
            action={{ label: t('error.retry'), onPress: () => riderQuery.refetch() }}
          />
        </View>
      ) : !rider ? (
        <View style={styles.centered}>
          <EmptyState
            title={t('unavailable.title')}
            description={t('unavailable.description')}
            action={{ label: t('unavailable.back'), onPress: goBack }}
          />
        </View>
      ) : (
        <RiderProfileContent rider={rider} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function RiderProfileContent({ rider, bottomInset }: { rider: Rider; bottomInset: number }) {
  const { t } = useTranslation('profile');
  const { session } = useAuth();
  const requireAccount = useRequireAccount();
  const setFollowing = useSetFollowing();
  const [section, setSection] = useState<ProfileSection>('rides');
  // Guests have no riding preferences to compare, so the match note is for signed-in riders only.
  const matchQuery = useRiderMatch(rider.id, { enabled: session?.profileCompleted === true });
  const match = matchQuery.data;

  const tabs: readonly ProfileTab<ProfileSection>[] = [
    { value: 'rides', label: t('tabs.rides'), icon: Motorcycle },
    { value: 'routes', label: t('tabs.routes'), icon: PathArrow },
    { value: 'garage', label: t('tabs.garage'), icon: Garage },
  ];

  const toggleFollow = () => {
    const following = !rider.isFollowing;
    requireAccount('followRider', () => setFollowing.mutate({ riderId: rider.id, following }));
  };

  return (
    <ScrollView
      stickyHeaderIndices={[1]}
      contentContainerStyle={{ paddingBottom: bottomInset + spacing.xxl }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ProfileHeader
          name={rider.name}
          handle={rider.handle}
          avatar={rider.avatar}
          bio={rider.bio}
          city={rider.city}
          bike={primaryBikeLine(rider.bikes, t)}
          followerCount={rider.followerCount}
          followingCount={rider.followingCount}
          note={
            match ? (
              <RiderMatchNote
                text={[
                  t('match.score', { value: formatNumber(match.score) }),
                  t('match.sharedRoutes', { count: match.sharedRouteCount }),
                  t(`match.sharedPreference.${match.reason}`),
                ].join(' · ')}
              />
            ) : null
          }
          actions={
            <View style={styles.actions}>
              {rider.isFollowing ? (
                <Button
                  label={t('actions.following')}
                  variant="outlined"
                  icon={Check}
                  onPress={toggleFollow}
                  accessibilityLabel={t('actions.following')}
                  style={styles.action}
                />
              ) : (
                <Button label={t('actions.follow')} onPress={toggleFollow} style={styles.action} />
              )}
              <Button
                label={t('actions.rideTogether')}
                variant="outlined"
                onPress={() => router.push({ pathname: '/ride-together/[id]', params: { id: rider.id } })}
                style={styles.action}
              />
            </View>
          }
        />
      </View>

      <ProfileTabs tabs={tabs} value={section} onChange={setSection} accessibilityLabel={t('tabs.label')} />

      <View style={styles.section}>
        {section === 'rides' ? <RidesFeed rider={rider} /> : null}
        {section === 'routes' ? <RoutesList riderId={rider.id} /> : null}
        {section === 'garage' ? <GarageList bikes={rider.bikes} /> : null}
      </View>
    </ScrollView>
  );
}

function primaryBikeLine(
  bikes: RiderBike[],
  t: ReturnType<typeof useTranslation<'profile'>>['t'],
): ProfileHeaderBike | undefined {
  const bike = bikes.find((item) => item.isPrimary) ?? bikes[0];
  if (!bike) {
    return undefined;
  }
  const name = `${motorcycleBrandNames[bike.brand]} ${bike.model}`;
  return {
    brand: bike.brand,
    label: bike.year ? t('bikeWithYear', { bike: name, year: bike.year }) : name,
  };
}

function RidesFeed({ rider }: { rider: Rider }) {
  const { t } = useTranslation(['profile', 'common']);
  const requireAccount = useRequireAccount();
  const { showToast } = useToast();
  const ridesQuery = useRiderRides(rider.id);
  const setLiked = useSetRideLiked();
  const setSaved = useSetRideSaved();
  const report = useReport();

  if (ridesQuery.isPending) {
    return <SectionLoading />;
  }
  const rides = ridesQuery.data ?? [];
  if (rides.length === 0) {
    return <EmptyState title={t('empty.rides.title')} description={t('empty.rides.description')} />;
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
          ? { variant: 'saved', message: t('activity.saved'), bottomOffset: TOAST_BOTTOM_OFFSET }
          : {
              variant: 'removed',
              message: t('activity.removed'),
              actionLabel: t('common:actions.undo'),
              onActionPress: () => setSaved.mutate({ rideId: ride.id, saved: true }),
              bottomOffset: TOAST_BOTTOM_OFFSET,
            },
      );
    });
  };

  // Comments have no screen yet (ride detail is not designed); the gate still applies so guests
  // see the sign-in prompt. Signed-in riders get the comment thread once it exists.
  const openComments = () => requireAccount('commentRide', () => undefined);

  const shareRide = (ride: RideSummary) => {
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
                showToast({ variant: 'success', message: t('report.done'), bottomOffset: TOAST_BOTTOM_OFFSET }),
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
          <RideActivityCard
            riderName={rider.name}
            riderAvatar={rider.avatar}
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
            onMorePress={() => openRideMenu(ride)}
          />
        </View>
      ))}
    </View>
  );
}

function RoutesList({ riderId }: { riderId: string }) {
  const { t } = useTranslation('profile');
  const routesQuery = useRiderRoutes(riderId);
  const { isSaved, toggleBookmark } = useRouteBookmark();

  if (routesQuery.isPending) {
    return <SectionLoading />;
  }
  const routes = routesQuery.data ?? [];
  if (routes.length === 0) {
    return <EmptyState title={t('empty.routes.title')} description={t('empty.routes.description')} />;
  }

  return (
    <View style={styles.list}>
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          variant="row"
          image={route.coverImage}
          title={route.name}
          subtitle={route.summary}
          distance={formatDistance(route.distanceKm)}
          duration={formatDuration(route.durationMinutes)}
          averageSpeed={formatSpeed(route.averageSpeedKmh)}
          saved={isSaved(route.id)}
          onToggleSave={() => toggleBookmark(route.id, { toastBottomOffset: TOAST_BOTTOM_OFFSET })}
          onPress={() => router.push({ pathname: '/route/[id]', params: { id: route.id } })}
        />
      ))}
    </View>
  );
}

function GarageList({ bikes }: { bikes: RiderBike[] }) {
  const { t } = useTranslation(['profile', 'common', 'garage']);

  if (bikes.length === 0) {
    return <EmptyState title={t('empty.garage.title')} description={t('empty.garage.description')} />;
  }

  const ordered = [...bikes].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return (
    <View style={styles.list}>
      {ordered.map((bike, index) => (
        <GarageBikeRow
          key={bike.id}
          brand={bike.brand}
          title={`${motorcycleBrandNames[bike.brand]} ${bike.model}`}
          detail={[
            bike.year ? String(bike.year) : null,
            bike.displacementCc ? t('common:units.cc', { value: formatNumber(bike.displacementCc) }) : null,
            bike.category ? t(`garage:categories.${bike.category}`) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          badgeLabel={bike.isPrimary && bikes.length > 1 ? t('garage.mainBike') : undefined}
          divider={index < ordered.length - 1}
        />
      ))}
    </View>
  );
}

function SectionLoading() {
  return (
    <View style={styles.sectionLoading}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
  },
  header: {
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  section: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  feed: {
    gap: spacing.lg,
  },
  list: {
    gap: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  sectionLoading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
});
