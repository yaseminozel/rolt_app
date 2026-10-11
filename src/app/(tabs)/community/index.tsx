import { router } from 'expo-router';
import { Search } from 'iconoir-react-native';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { PostComposer } from '@/components/community/PostComposer';
import { StackedCardsIllustration } from '@/components/illustrations/StackedCardsIllustration';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { composeIntent } from '@/features/community/composeIntent';
import { useCommunityFeed, useFollowAuthor, useSetPostLiked } from '@/features/community/queries';
import type { CommunityPost, FeedFilter } from '@/features/community/types';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { haptics, hapticToggle } from '@/features/haptics/haptics';
import { colors, fontFamily, layout, radius, spacing } from '@/theme';

/** Room for the floating tab bar under the last post. */
const TAB_BAR_ROOM = 120;

/**
 * 13.01 Topluluk / Akış (Pencil `pfLw4` default, `T0ZMr` composing, `ZwHY6` empty): title
 * with search, the composer, "Son paylaşılanlar" with a filter and the posts divided by
 * hairlines; empty, the composer gives way to the stacked-cards picture and two actions.
 * Likes, comments and follows need an account (guests sign in first).
 */
export default function CommunityScreen() {
  const { t } = useTranslation('community');
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useCommunityFeed(filter);
  const setLiked = useSetPostLiked();
  const followAuthor = useFollowAuthor();
  const posts = feed.data ?? [];
  const empty = !feed.isPending && posts.length === 0;
  const scrollRef = useRef<ScrollView>(null);
  // A post started elsewhere (a ride's "Toplulukta paylaş", the profile "+") brings the
  // composer back to the top, even over the empty feed.
  const [composing, setComposing] = useState(() => composeIntent.isPending());
  useEffect(
    () =>
      composeIntent.watch(() => {
        setComposing(true);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }),
    [],
  );

  const like = (post: CommunityPost) =>
    requireAccount('likeRide', () => {
      hapticToggle(!post.isLiked);
      setLiked.mutate({ postId: post.id, liked: !post.isLiked });
    });
  const comment = (post: CommunityPost) =>
    router.push({ pathname: '/community/comments', params: { postId: post.id } });
  const share = (post: CommunityPost) =>
    Share.share({
      message: [post.ride?.title, post.text, t('shareSignature', { name: post.author.name })]
        .filter(Boolean)
        .join('\n'),
    }).catch(() => undefined);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        testID="community-feed"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + TAB_BAR_ROOM },
          empty && styles.contentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => {
              haptics.tap();
              feed.refetch();
            }}
          />
        }>
        <View style={styles.top}>
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">
              {t('title')}
            </Text>
            <Pressable
              onPress={() => router.push('/community/search')}
              accessibilityRole="button"
              accessibilityLabel={t('search.open')}
              style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
              <Search width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          </View>
          {empty && !composing ? null : <PostComposer />}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('recent')}
            </Text>
            <FilterChip
              type="toggle"
              label={t('filter.label')}
              selected={filter === 'following'}
              accessibilityLabel={t('filter.following')}
              onPress={() => setFilter((current) => (current === 'all' ? 'following' : 'all'))}
            />
          </View>

          {feed.isPending ? (
            <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
          ) : empty ? (
            <View style={styles.empty} testID="community-empty">
              <StackedCardsIllustration />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle} accessibilityRole="header">
                  {t('empty.title')}
                </Text>
                <Text style={styles.emptyDescription}>{t('empty.description')}</Text>
              </View>
              <View style={styles.emptyActions}>
                <Button label={t('empty.shareRide')} onPress={() => router.push('/record-ride')} />
                <Button
                  variant="text"
                  label={t('empty.discover')}
                  onPress={() => router.navigate('/discover')}
                />
              </View>
            </View>
          ) : (
            posts.map((post, index) => (
              <Fragment key={post.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <CommunityPostCard
                  post={post}
                  onAuthorPress={() =>
                    router.push({ pathname: '/rider/[id]', params: { id: post.author.id } })
                  }
                  onFollowPress={() =>
                    requireAccount('followRider', () => {
                      hapticToggle(true);
                      followAuthor.mutate(post.author.id);
                    })
                  }
                  onLikePress={() => like(post)}
                  onCommentPress={() => comment(post)}
                  onSharePress={() => share(post)}
                  onRidePress={
                    post.rideId
                      ? () =>
                          router.push({
                            pathname: '/rides/[rideId]',
                            params: { rideId: post.rideId! },
                          })
                      : undefined
                  }
                />
              </Fragment>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenGutter,
  },
  top: {
    gap: spacing.lg,
  },
  titleRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  searchButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  section: {
    gap: spacing.lg,
  },
  sectionHeader: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  loading: {
    paddingVertical: spacing.xxxl,
  },
  // "Boş durum" (`ZwHY6`): 96 pt below the section header, 24 pt between its parts.
  empty: {
    gap: spacing.xxl,
    paddingTop: 96 - spacing.lg,
  },
  emptyCopy: {
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});
