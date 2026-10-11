import { Send } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useOnRemoteComment,
} from '@/features/community/queries';
import type { CommentTarget, CommunityComment } from '@/features/community/types';
import { useLiveComments } from '@/features/community/useLiveComments';
import { useOwnRiderId } from '@/features/riders/ownRider';
import { formatNumber, formatShortAgo } from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { showActionSheet } from '@/lib/showActionSheet';
import { avatarTone, colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 36;
const COMMENT_MAX = 280;

/** What the sheet header says about the thread; the route reads it from its post or ride. */
export type CommentSubject = {
  /** Comment count of the post or ride (falls back to the loaded comments). */
  count?: number;
  /** Ride title, or the author's name for posts without a ride. */
  title?: string;
  /** The post's author or the ride's rider: they may delete any comment on it. */
  ownerId?: string;
};

type CommentsSheetProps = {
  target: CommentTarget | undefined;
  subject: CommentSubject;
};

/**
 * 13.02 Topluluk / Yorumlar (Pencil `LEzhw`): "Yorumlar · N" and the post or ride title over its
 * comments, oldest first, and a "Yorum yaz…" field with a send glyph. The same sheet serves
 * community posts and riders' rides. New comments by others arrive live while it is open.
 * Writing needs an account; a long press offers "Yorumu sil" on the viewer's own comments and on
 * every comment of their own post or ride.
 */
export function CommentsSheet({ target, subject }: CommentsSheetProps) {
  const { t } = useTranslation('community');
  const insets = useSafeAreaInsets();
  const thread = target ?? { type: 'post', id: '' };
  const comments = useComments(target);
  const addComment = useAddComment(thread);
  const deleteComment = useDeleteComment(thread);
  const onRemoteComment = useOnRemoteComment(thread);
  const requireAccount = useRequireAccount();
  const viewerId = useOwnRiderId();
  const [text, setText] = useState('');
  const count = subject.count ?? comments.data?.length ?? 0;
  const canSend = Boolean(text.trim()) && !addComment.isPending;

  useLiveComments(target, viewerId, onRemoteComment);

  const send = () =>
    requireAccount('commentRide', async () => {
      if (!text.trim()) {
        return;
      }
      try {
        await addComment.mutateAsync(text);
        setText('');
      } catch {
        // The typed text stays for another try.
        Alert.alert(t('comments.sendFailed'));
      }
    });

  const canDelete = (comment: CommunityComment) =>
    Boolean(viewerId) && (comment.author.id === viewerId || subject.ownerId === viewerId);

  const removeComment = (comment: CommunityComment) =>
    deleteComment.mutate(comment.id, {
      onError: () => Alert.alert(t('comments.deleteFailed')),
    });

  const openCommentMenu = (comment: CommunityComment) =>
    showActionSheet({
      cancelLabel: t('comments.cancel'),
      options: [
        { label: t('comments.delete'), destructive: true, onPress: () => removeComment(comment) },
      ],
    });

  return (
    <KeyboardAvoidingView
      testID="comments-sheet"
      style={styles.sheet}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader
        title={t('comments.title', { count: formatNumber(count) })}
        subtitle={subject.title}
      />
      {comments.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
      ) : (
        <FlatList
          style={styles.list}
          data={comments.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              onDelete={canDelete(item) ? () => openCommentMenu(item) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>{t('comments.empty')}</Text>}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('comments.placeholder')}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.textPrimary}
            maxLength={COMMENT_MAX}
            multiline
            style={styles.input}
            accessibilityLabel={t('comments.placeholder')}
            testID="comments-input"
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('comments.send')}
            accessibilityState={{ disabled: !canSend }}
            style={[styles.send, !canSend && styles.sendDisabled]}>
            <Send width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment, onDelete }: { comment: CommunityComment; onDelete?: () => void }) {
  const { t } = useTranslation('community');
  return (
    <Pressable
      onLongPress={onDelete}
      disabled={!onDelete}
      accessibilityActions={onDelete ? [{ name: 'delete', label: t('comments.delete') }] : undefined}
      onAccessibilityAction={onDelete ? () => onDelete() : undefined}
      style={styles.row}>
      <ProfileAvatar
        source={comment.author.avatar}
        initials={initialsOf(comment.author.name)}
        tone={avatarTone(comment.author.id)}
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
    </Pressable>
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
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  field: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    maxHeight: 120,
    paddingVertical: 12,
    color: colors.textPrimary,
  },
  send: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
