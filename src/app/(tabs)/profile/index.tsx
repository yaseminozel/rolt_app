import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Bookmark, Camera, Motorcycle, Settings } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusIcon } from '@/components/feedback/StatusIcon';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTab } from '@/components/profile/ProfileTabs';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { RideActivityCard } from '@/components/profile/RideActivityCard';
import { RiderRidesFeed } from '@/components/profile/RiderRidesFeed';
import { averageSpeedKmh } from '@/components/ride-form/RideSummaryCard';
import { RouteCard } from '@/components/route/RouteCard';
import { Button } from '@/components/ui/Button';
import { useOwnProfile, useUpdateOwnProfile } from '@/features/profile/queries';
import type { OwnProfile } from '@/features/profile/types';
import { useRiderRides } from '@/features/riders/queries';
import { useSavedRides } from '@/features/rides/queries';
import { rideTitle } from '@/features/rides/rideTitle';
import { useRoutesByIds } from '@/features/routes/queries';
import { useSavedRoutes } from '@/features/routes/SavedRoutesProvider';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import {
  formatApproxDuration,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatSpeed,
} from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, spacing } from '@/theme';

type Section = 'rides' | 'saved';

const PHOTO_QUALITY = 0.8;
/** Toasts clear the floating tab bar. */
const TOAST_OFFSET = 96;
/** Design: identity block starts 14 pt under the top bar. */
const HEADER_TOP_PADDING = 14;

/**
 * 09.01 Profil / Genel (Pencil `Ct2Yd`, scrolled `TDo7W`, new rider `rvUtZ`): the own profile with
 * camera (profile photo) and settings, identity, "Profili düzenle" / "Profili paylaş", and the
 * Sürüşler / Kaydettiklerim tabs. Rides recorded on this device come first and open their detail
 * (09.06); a rider without rides gets "İlk sürüşünü kaydet". "Alt. Paylaşım odaklı" (`ED8bv`) is an
 * alternative and not implemented.
 */
export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const profileQuery = useOwnProfile();
  const updateProfile = useUpdateOwnProfile();
  const profile = profileQuery.data;

  const pickPhoto = () => {
    const apply = (result: ImagePicker.ImagePickerResult) => {
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) {
        updateProfile.mutate({ photoUri: uri });
      }
    };
    showActionSheet({
      title: t('photo.title'),
      cancelLabel: t('menu.cancel'),
      options: [
        {
          label: t('photo.camera'),
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(t('photo.cameraPermission.title'), t('photo.cameraPermission.message'), [
                { text: t('menu.cancel'), style: 'cancel' },
                { text: t('photo.openSettings'), onPress: () => Linking.openSettings() },
              ]);
              return;
            }
            try {
              apply(
                await ImagePicker.launchCameraAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: PHOTO_QUALITY,
                }),
              );
            } catch {
              // No camera (simulator).
            }
          },
        },
        {
          label: t('photo.library'),
          onPress: async () =>
            apply(
              await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: PHOTO_QUALITY,
              }),
            ),
        },
      ],
    });
  };

  return (
    <View style={styles.screen}>
      <ProfileTopBar
        actions={[
          { icon: Camera, accessibilityLabel: t('actions.changePhoto'), onPress: pickPhoto },
          {
            icon: Settings,
            accessibilityLabel: t('actions.settings'),
            onPress: () => router.push('/settings'),
          },
        ]}
      />
      {profile ? (
        <ProfileContent profile={profile} />
      ) : (
        <View style={styles.centered}>
          {profileQuery.isError ? (
            <EmptyState
              title={t('error.title')}
              description={t('error.description')}
              action={{ label: t('error.retry'), onPress: () => profileQuery.refetch() }}
            />
          ) : (
            <ActivityIndicator color={colors.textSecondary} />
          )}
        </View>
      )}
    </View>
  );
}

function ProfileContent({ profile }: { profile: OwnProfile }) {
  const { t } = useTranslation('profile');
  const [section, setSection] = useState<Section>('rides');
  const avatar = profile.photoUri ? { uri: profile.photoUri } : profile.sampleAvatar;

  const tabs: readonly ProfileTab<Section>[] = [
    { value: 'rides', label: t('tabs.rides'), icon: Motorcycle },
    { value: 'saved', label: t('tabs.saved'), icon: Bookmark },
  ];

  const bike = profile.bike
    ? {
        brand: profile.bike.brand,
        label: `${motorcycleBrandNames[profile.bike.brand]} ${profile.bike.model}`,
      }
    : undefined;

  return (
    <ScrollView
      stickyHeaderIndices={[1]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ProfileHeader
          name={profile.name}
          handle={profile.handle}
          avatar={avatar}
          avatarInitials={initialsOf(profile.name)}
          bio={profile.bio}
          city={profile.city}
          bike={bike}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          actions={
            <View style={styles.actions}>
              <Button
                variant="tonal"
                label={t('actions.editProfile')}
                // "Profili düzenle" (09.05) comes with Akış 20.
                onPress={() => undefined}
                style={styles.action}
              />
              <Button
                variant="tonal"
                label={t('actions.share')}
                onPress={() => router.push('/share-profile')}
                style={styles.action}
              />
            </View>
          }
        />
      </View>

      <ProfileTabs
        tabs={tabs}
        value={section}
        onChange={setSection}
        accessibilityLabel={t('tabs.label')}
      />

      <View style={styles.section}>
        {section === 'rides' ? <OwnRides profile={profile} avatar={avatar} /> : <SavedRoutes />}
      </View>
    </ScrollView>
  );
}

function OwnRides({
  profile,
  avatar,
}: {
  profile: OwnProfile;
  avatar: OwnProfile['sampleAvatar'];
}) {
  const { t } = useTranslation(['profile', 'rides']);
  const savedRides = useSavedRides();
  const sampleRides = useRiderRides(profile.sampleRiderId);
  const rides = savedRides.data ?? [];

  if (savedRides.isPending) {
    return <ActivityIndicator color={colors.textSecondary} style={styles.loading} />;
  }
  const hasSample = (sampleRides.data?.length ?? 0) > 0;
  const sampleLoading = Boolean(profile.sampleRiderId) && sampleRides.isPending;
  if (rides.length === 0 && !hasSample && !sampleLoading) {
    return (
      <View style={styles.empty}>
        <EmptyState
          icon={<StatusIcon status="neutral" />}
          title={t('own.empty.title')}
          description={t('own.empty.description')}
        />
        <Button
          size="lg"
          label={t('own.empty.action')}
          onPress={() => router.navigate('/record')}
        />
      </View>
    );
  }

  const openRide = (rideId: string) =>
    router.push({ pathname: '/rides/[rideId]', params: { rideId } });

  return (
    <View style={styles.feed}>
      {rides.map((ride, index) => (
        <View key={ride.id} style={styles.feed}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <RideActivityCard
            riderName={profile.name}
            riderAvatar={avatar}
            date={formatDateTime(new Date(ride.startedAt))}
            title={rideTitle(ride)}
            rideType={ride.rideType}
            metrics={{
              distance: formatDistance(ride.stats.distanceM / 1000, 1),
              duration: formatDuration(ride.stats.durationS / 60),
              averageSpeed: formatSpeed(averageSpeedKmh(ride)),
            }}
            track={ride.track}
            photos={ride.photos
              .filter((photo) => photo.status === 'uploaded')
              .map((photo) => ({ uri: photo.uri }))}
            likeCount={0}
            commentCount={0}
            saveCount={0}
            liked={false}
            saved={false}
            // Rides aren't online yet, so nobody can react to them: the actions open the ride.
            onLikePress={() => openRide(ride.id)}
            onCommentPress={() => openRide(ride.id)}
            onSavePress={() => openRide(ride.id)}
            onSharePress={() => openRide(ride.id)}
            onMorePress={() =>
              router.push({ pathname: '/rides/[rideId]/options', params: { rideId: ride.id } })
            }
            onPress={() => openRide(ride.id)}
          />
        </View>
      ))}
      {profile.sampleRiderId ? (
        <>
          {rides.length > 0 && hasSample ? <View style={styles.divider} /> : null}
          <RiderRidesFeed
            riderId={profile.sampleRiderId}
            riderName={profile.name}
            riderAvatar={avatar}
            own
            toastBottomOffset={TOAST_OFFSET}
          />
        </>
      ) : null}
    </View>
  );
}

function SavedRoutes() {
  const { t } = useTranslation(['profile', 'routes']);
  const { savedIds } = useSavedRoutes();
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const routesQuery = useRoutesByIds(savedIds);
  const routes = routesQuery.data ?? [];

  if (savedIds.length === 0) {
    return <EmptyState title={t('saved.empty.title')} description={t('saved.empty.description')} />;
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
          duration={formatApproxDuration(route.durationMinutes)}
          badgeLabel={t(`routes:tags.${route.tag}`)}
          saved={isSaved(route.id)}
          onToggleSave={() => toggleBookmark(route.id, { toastBottomOffset: TOAST_OFFSET })}
          onPress={() => router.push({ pathname: '/route/[id]', params: { id: route.id } })}
        />
      ))}
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
  content: {
    paddingBottom: TOAST_OFFSET + spacing.xxl,
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
  loading: {
    paddingVertical: spacing.xxxl,
  },
  empty: {
    gap: spacing.xxl,
    paddingTop: spacing.huge,
  },
});
