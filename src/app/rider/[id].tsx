import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { MoreHoriz } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { ProfileHeader, type ProfileHeaderBike } from '@/components/profile/ProfileHeader';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { RiderRidesFeed } from '@/components/profile/RiderRidesFeed';
import { RiderMatchNote } from '@/components/profile/RiderMatchNote';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam } from '@/features/auth/credentials';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import {
  useBlockRider,
  useReport,
  useRider,
  useRiderMatch,
  useSetFollowing,
} from '@/features/riders/queries';
import { hapticToggle } from '@/features/haptics/haptics';
import type { Rider, RiderBike } from '@/features/riders/types';
import { formatNumber } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, spacing } from '@/theme';
import { initialsOf } from '@/lib/initials';

/** No tab bar on this root-stack screen, so toasts sit just above the bottom safe area. */
const TOAST_BOTTOM_OFFSET = spacing.lg;
/** Design: identity block starts 14 pt under the top bar (y 99 → 113). */
const HEADER_TOP_PADDING = 14;

/**
 * 13.03 Topluluk / Sürücü profili (Pencil `x913L`; was 01.8 `gKG8D`): identity, follow, then
 * the rider's rides as community post cards — no tabs. The share button of the old design is
 * gone; "…" (report / block) stays, as a UGC safety requirement. Opened from the route detail's
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
              report
                .mutateAsync({ type: 'rider', riderId: profile.id })
                .then(() =>
                  showToast({
                    variant: 'success',
                    message: t('report.done'),
                    bottomOffset: TOAST_BOTTOM_OFFSET,
                  }),
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
                {
                  icon: MoreHoriz,
                  accessibilityLabel: t('actions.more'),
                  onPress: () => openMenu(rider),
                },
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
  // Guests have no riding preferences to compare, so the match note is for signed-in riders only.
  const matchQuery = useRiderMatch(rider.id, { enabled: session?.profileCompleted === true });
  const match = matchQuery.data;


  const toggleFollow = () => {
    const following = !rider.isFollowing;
    requireAccount('followRider', () => {
      hapticToggle(following);
      setFollowing.mutate({ riderId: rider.id, following });
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: bottomInset + spacing.xxl }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ProfileHeader
          name={rider.name}
          handle={rider.handle}
          avatar={rider.avatar}
          avatarInitials={initialsOf(rider.name)}
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
                // 13.03 "Takip ediliyor" (Figma `1114:22157`): one full-width "Takibi bırak".
                <Button
                  label={t('actions.unfollow')}
                  variant="outlined"
                  onPress={toggleFollow}
                  style={styles.action}
                />
              ) : (
                <>
                  <Button label={t('actions.follow')} onPress={toggleFollow} style={styles.action} />
                  <Button
                    label={t('actions.rideTogether')}
                    variant="outlined"
                    onPress={() =>
                      router.push({ pathname: '/ride-together/[id]', params: { id: rider.id } })
                    }
                    style={styles.action}
                  />
                </>
              )}
            </View>
          }
        />
      </View>

      <View style={styles.section}>
        <RiderRidesFeed
          riderId={rider.id}
          riderName={rider.name}
          riderAvatar={rider.avatar}
          community={{
            handle: rider.handle,
            bike: primaryBikeLine(rider.bikes, t)?.label,
            isFollowing: rider.isFollowing,
          }}
        />
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
  // A full-width hairline separates the identity from the rides (13.03 `x913L`).
  header: {
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
