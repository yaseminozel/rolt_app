import { useLocalSearchParams } from 'expo-router';
import { Send } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useAddComment, useCommunityPost, usePostComments } from '@/features/community/queries';
import type { CommunityComment } from '@/features/community/types';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { formatNumber, formatShortAgo } from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 36;
const COMMENT_MAX = 280;

/**
 * 13.02 Topluluk / Yorumlar (Figma `1005:39609`): "Yorumlar · N" over the post's comments,
 * oldest first, and "Yorum yaz…" at the bottom. Writing needs an account.
 */
export default function CommentsSheet() {
  const { t } = useTranslation('community');
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { data: post } = useCommunityPost(postId);
  const comments = usePostComments(postId);
  const addComment = useAddComment(postId ?? '');
  const requireAccount = useRequireAccount();
  const [text, setText] = useState('');
  const count = comments.data?.length ?? post?.commentCount ?? 0;

  const send = () =>
    requireAccount('commentRide', async () => {
      if (!text.trim()) {
        return;
      }
      await addComment.mutateAsync(text);
      setText('');
    });

  return (
    <KeyboardAvoidingView
      style={styles.sheet}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title={t('comments.title', { count: formatNumber(count) })} />
      {comments.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : (
        <FlatList
          style={styles.list}
          data={comments.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentRow comment={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('comments.empty')}</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('comments.placeholder')}
          placeholderTextColor={colors.textTertiary}
          maxLength={COMMENT_MAX}
          multiline
          style={styles.input}
          accessibilityLabel={t('comments.placeholder')}
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || addComment.isPending}
          accessibilityRole="button"
          accessibilityLabel={t('comments.send')}
          style={({ pressed }) => [
            styles.send,
            (!text.trim() || addComment.isPending) && styles.sendDisabled,
            pressed && styles.sendPressed,
          ]}>
          <Send width={20} height={20} color={colors.textInverse} strokeWidth={1.5} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment }: { comment: CommunityComment }) {
  return (
    <View style={styles.row}>
      <ProfileAvatar
        source={comment.author.avatar}
        initials={initialsOf(comment.author.name)}
        size={AVATAR_SIZE}
      />
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {comment.author.name}
          </Text>
          <Text style={styles.time}>{formatShortAgo(new Date(comment.createdAt))}</Text>
        </View>
        <Text style={styles.text}>{comment.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    paddingVertical: spacing.xxxl,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  text: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
  },
  send: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceInverse,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.8,
  },
});
