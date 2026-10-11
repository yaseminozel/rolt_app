import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Bookmark, Camera, Motorcycle, Plus, Settings } from 'iconoir-react-native';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusIcon } from '@/components/feedback/StatusIcon';
import { useToast } from '@/components/feedback/ToastProvider';
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
import { useOwnRiderId } from '@/features/riders/ownRider';
import { useRiderRides, useSavedRideList } from '@/features/riders/queries';
import type { RideDetail } from '@/features/riders/types';
import { useRideActions } from '@/features/riders/useRideActions';
import { useSavedRides } from '@/features/rides/queries';
import { rideTitle } from '@/features/rides/rideTitle';
import { rideSyncState } from '@/features/rides/sync/useRideSyncState';
import { useRoutesByIds } from '@/features/routes/queries';
import { useSavedRoutes } from '@/features/routes/SavedRoutesProvider';
import { useRouteBookmark } from '@/features/routes/useRouteBookmark';
import { formatDateTime, formatDistance, formatDuration, formatSpeed } from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { showActionSheet } from '@/lib/showActionSheet';
import { hasSupabase } from '@/lib/supabase/client';
import { colors, layout, spacing, typography } from '@/theme';
import { openShareRide } from '@/features/rides/openShareRide';
import { AddMenu } from '@/components/profile/AddMenu';
import { composeIntent } from '@/features/community/composeIntent';

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
 * (09.06); once uploaded they carry the server's likes, comments and bookmarks. A rider without
 * rides gets "İlk sürüşünü kaydet". "Alt. Paylaşım odaklı" (`ED8bv`) is an alternative and not
 * implemented.
 */
export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileQuery = useOwnProfile();
  const updateProfile = useUpdateOwnProfile();
  const { showToast } = useToast();
  const profile = profileQuery.data;

  const pickPhoto = () => {
    const apply = (result: ImagePicker.ImagePickerResult) => {
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (uri) {
        updateProfile.mutate(
          { photoUri: uri },
          {
            onError: () =>
              showToast({
                variant: 'failure',
                message: t('edit.failed'),
                bottomOffset: TOAST_OFFSET,
              }),
          },
        );
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

  // 09.01 "+" menu: start a community post here, finish it in the Topluluk composer.
  const startPost = () => {
    composeIntent.set({ photoUris: [] });
    router.navigate('/community');
  };
  const startPhotoPost = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: PHOTO_QUALITY,
    });
    if (!result.canceled && result.assets.length > 0) {
      composeIntent.set({ photoUris: result.assets.map((asset) => asset.uri) });
      router.navigate('/community');
    }
  };

  return (
    <View style={styles.screen}>
      <ProfileTopBar
        leading={{ icon: Plus, accessibilityLabel: t('addMenu.open'), onPress: () => setMenuOpen(true) }}
        actions={[
          { icon: Camera, accessibilityLabel: t('actions.changePhoto'), onPress: pickPhoto },
          {
            icon: Settings,
            accessibilityLabel: t('actions.settings'),
            onPress: () => router.push('/settings'),
            testID: 'profile-settings',
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
      <AddMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPost={startPost}
        onPhotos={startPhotoPost}
      />
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
                onPress={() => router.push('/edit-profile')}
                style={styles.action}
              />
              <Button
                variant="tonal"
                label={t('actions.share')}
                // The link is the username's; without one the rider picks it first.
                onPress={() => router.push(profile.handle ? '/share-profile' : '/edit-profile')}
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
        {section === 'rides' ? <OwnRides profile={profile} avatar={avatar} /> : <SavedItems />}
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
  // The server's copy of the uploaded rides: likes, comments and bookmarks by id.
  const ownRiderId = useOwnRiderId();
  const serverRides = useRiderRides(hasSupabase ? ownRiderId : undefined);
  const serverById = new Map((serverRides.data ?? []).map((ride) => [ride.id, ride]));
  const { toggleLike, toggleSave } = useRideActions({ toastBottomOffset: TOAST_OFFSET });

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
          onPress={() => router.push('/record-ride')}
        />
      </View>
    );
  }

  const openRide = (rideId: string) =>
    router.push({ pathname: '/rides/[rideId]', params: { rideId } });

  return (
    <View style={styles.feed}>
      {rides.map((ride, index) => {
        // Only a synced ride shows the server's reactions; until then it is local-only.
        const server =
          rideSyncState(ride).status === 'synced' ? serverById.get(ride.id) : undefined;
        return (
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
                .filter((photo) => photo.status !== 'uploading')
                .map((photo) => ({ uri: photo.uri }))}
              likeCount={server?.likeCount ?? 0}
              commentCount={server?.commentCount ?? 0}
              saveCount={server?.saveCount ?? 0}
              liked={server?.isLiked ?? false}
              saved={server?.isSaved ?? false}
              // Not synced, nobody can react to the ride: the actions open it instead.
              onLikePress={() => (server ? toggleLike(server) : openRide(ride.id))}
              onCommentPress={() =>
                server
                  ? router.push({ pathname: '/profile/comments', params: { rideId: ride.id } })
                  : openRide(ride.id)
              }
              onSavePress={() => (server ? toggleSave(server) : openRide(ride.id))}
              onSharePress={() => openShareRide(ride.id)}
              onMorePress={() =>
                router.push({ pathname: '/rides/[rideId]/options', params: { rideId: ride.id } })
              }
              onPress={() => openRide(ride.id)}
            />
          </View>
        );
      })}
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

/**
 * 09.04 Kaydettiklerim (Pencil `tBE7w` list, `iGC1m` empty): saved routes as row cards with
 * distance and time, divided by hairlines; newest first. Bookmarked rides follow as the same row
 * cards (the design has none: picture, title, rider, type, distance and time) and open their
 * detail; with both, each list gets a heading. The empty state shows when neither has any.
 */
function SavedItems() {
  const { t } = useTranslation('profile');
  const { savedIds } = useSavedRoutes();
  const savedRides = useSavedRideList();
  const rides = savedRides.data ?? [];

  if (savedIds.length === 0 && rides.length === 0) {
    return savedRides.isLoading ? (
      <ActivityIndicator color={colors.textSecondary} style={styles.loading} />
    ) : (
      <View style={styles.savedEmpty}>
        <EmptyState title={t('saved.empty.title')} description={t('saved.empty.description')} />
      </View>
    );
  }
  const headings = savedIds.length > 0 && rides.length > 0;
  return (
    <View style={styles.savedSections}>
      {savedIds.length > 0 ? (
        <View style={styles.savedSection}>
          {headings ? <SavedHeading label={t('saved.sections.routes')} /> : null}
          <SavedRoutes savedIds={savedIds} />
        </View>
      ) : null}
      {rides.length > 0 ? (
        <View style={styles.savedSection}>
          {headings ? <SavedHeading label={t('saved.sections.rides')} /> : null}
          <SavedRides rides={rides} />
        </View>
      ) : null}
    </View>
  );
}

function SavedHeading({ label }: { label: string }) {
  return (
    <Text style={styles.savedHeading} accessibilityRole="header">
      {label}
    </Text>
  );
}

function SavedRides({ rides }: { rides: RideDetail[] }) {
  const { t } = useTranslation('rides');
  const { toggleSave } = useRideActions({ toastBottomOffset: TOAST_OFFSET });
  return (
    <View style={styles.savedList}>
      {rides.map((ride, index) => (
        <Fragment key={ride.id}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <RouteCard
            variant="row"
            image={ride.photos[0] ?? ride.mapImage}
            title={ride.title}
            subtitle={ride.author.name}
            distance={formatDistance(ride.distanceKm)}
            duration={formatDuration(ride.durationMinutes)}
            badgeLabel={t(`types.${ride.rideType}`)}
            saved={ride.isSaved}
            onToggleSave={() => toggleSave(ride)}
            onPress={() => router.push({ pathname: '/rides/[rideId]', params: { rideId: ride.id } })}
          />
        </Fragment>
      ))}
    </View>
  );
}

function SavedRoutes({ savedIds }: { savedIds: readonly string[] }) {
  const { t } = useTranslation(['profile', 'routes']);
  const { isSaved, toggleBookmark } = useRouteBookmark();
  const routesQuery = useRoutesByIds(savedIds);
  const routes = routesQuery.data ?? [];

  return (
    <View style={styles.savedList}>
      {routes.map((route, index) => (
        <Fragment key={route.id}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <RouteCard
            variant="row"
            image={route.coverImage}
            title={route.name}
            subtitle={route.summary}
            distance={formatDistance(route.distanceKm)}
            duration={formatDuration(route.durationMinutes)}
            badgeLabel={t(`routes:tags.${route.tag}`)}
            saved={isSaved(route.id)}
            onToggleSave={() => toggleBookmark(route.id, { toastBottomOffset: TOAST_OFFSET })}
            onPress={() => router.push({ pathname: '/route/[id]', params: { id: route.id } })}
          />
        </Fragment>
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
  // 8 pt either side of the hairline between saved route cards.
  savedList: {
    gap: spacing.sm,
  },
  savedSections: {
    gap: spacing.xxl,
  },
  savedSection: {
    gap: spacing.md,
  },
  // The section title of the ride detail (09.06).
  savedHeading: {
    ...typography.bodyLargeSemibold,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  // The empty state sits 116 pt under the tabs (09.04 `1005:35792` at y 506, tabs end at 390).
  savedEmpty: {
    paddingTop: 116 - spacing.lg,
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
