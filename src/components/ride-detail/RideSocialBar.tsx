import {
  Bookmark,
  BookmarkSolid,
  ChatBubbleEmpty,
  Heart,
  HeartSolid,
} from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CountAction } from '@/components/community/CommunityPostCard';
import { colors, spacing } from '@/theme';

type RideSocialBarProps = {
  likeCount: number;
  commentCount: number;
  liked: boolean;
  onLikePress: () => void;
  onCommentPress: () => void;
  /** Bookmark with its count; left out when omitted. */
  save?: { count: number; saved: boolean; onPress: () => void };
};

/**
 * Likes, comments and bookmarks of an uploaded ride on its detail (09.06): the community post
 * card's actions (glyph + Mono count), under the title and rider. The detail has no design for
 * them; they reuse the card's look rather than adding a new one.
 */
export function RideSocialBar({
  likeCount,
  commentCount,
  liked,
  onLikePress,
  onCommentPress,
  save,
}: RideSocialBarProps) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.row}>
      <CountAction
        icon={liked ? HeartSolid : Heart}
        iconColor={liked ? colors.like : colors.textPrimary}
        count={likeCount}
        label={t('activity.like')}
        selected={liked}
        onPress={onLikePress}
      />
      <CountAction
        icon={ChatBubbleEmpty}
        count={commentCount}
        label={t('activity.comment')}
        onPress={onCommentPress}
      />
      {save ? (
        <CountAction
          icon={save.saved ? BookmarkSolid : Bookmark}
          count={save.count}
          label={t('activity.save')}
          selected={save.saved}
          onPress={save.onPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
});
