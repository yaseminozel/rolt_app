import { router } from 'expo-router';
import { Search } from 'iconoir-react-native';
import { Fragment, useState } from 'react';
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
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { useCommunityFeed, useSetPostLiked } from '@/features/community/queries';
import type { CommunityPost, FeedFilter } from '@/features/community/types';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

/** Room for the floating tab bar under the last post. */
const TAB_BAR_ROOM = 120;

/**
 * 13.01 Topluluk / Akış (Figma `1005:39834` default, `1005:39885` composing, `1005:39577`
 * empty): title with search, the composer, "Son paylaşılanlar" with a filter and the posts
 * divided by hairlines. Likes and comments need an account (guests sign in first).
 */
export default function CommunityScreen() {
  const { t } = useTranslation('community');
  const insets = useSafeAreaInsets();
  const requireAccount = useRequireAccount();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useCommunityFeed(filter);
  const setLiked = useSetPostLiked();
  const posts = feed.data ?? [];

  const like = (post: CommunityPost) =>
    requireAccount('likeRide', () => setLiked.mutate({ postId: post.id, liked: !post.isLiked }));
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + TAB_BAR_ROOM },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} />
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
              <Search width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          </View>
          <PostComposer />
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
          ) : posts.length === 0 ? (
            <View style={styles.empty}>
              <EmptyState title={t('empty.title')} description={t('empty.description')} />
              <View style={styles.emptyActions}>
                <Button label={t('empty.shareRide')} onPress={() => router.navigate('/record')} />
                <Button
                  variant="outlined"
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
                  onLikePress={() => like(post)}
                  onCommentPress={() => comment(post)}
                  onSharePress={() => share(post)}
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
    ...typography.bodyLargeSemibold,
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
  empty: {
    gap: spacing.xxl,
    paddingTop: spacing.xxxl,
  },
  emptyActions: {
    gap: spacing.md,
  },
});
