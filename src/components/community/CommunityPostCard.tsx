import { Image } from 'expo-image';
import { ChatBubbleEmpty, Heart, HeartSolid, ShareAndroid } from 'iconoir-react-native';
import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { RideTypeBadge } from '@/components/ride/RideTypeBadge';
import type { CommunityPost } from '@/features/community/types';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatNumber,
  formatPostTime,
  formatSpeed,
} from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

const AVATAR_SIZE = 36;
const ACTION_ICON_SIZE = 20;
const METRIC_COLUMN_WIDTH = 96;
const MAP_WIDTH = 240;
const PHOTO_WIDTH = 86;
const MEDIA_HEIGHT = 100;
/** Photo-only posts: a full-width carousel ("Post / Fotoğraf", 4:3). */
const CAROUSEL_RATIO = 3 / 4;
/** Text-only posts fold after this many lines with "Devamını gör". */
const TEXT_LINES = 4;
const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

type CommunityPostCardProps = {
  post: CommunityPost;
  onAuthorPress: () => void;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
};

/**
 * A community post (13.01 "Post / …", Figma `1005:39842`–`1005:39848`): author with bike and
 * time, then whatever was shared — text (folded after four lines), a ride or route with its
 * type and metrics, photos (a strip after the ride map, or a full-width carousel on their own) —
 * and like / comment counts with share.
 */
export function CommunityPostCard({
  post,
  onAuthorPress,
  onLikePress,
  onCommentPress,
  onSharePress,
}: CommunityPostCardProps) {
  const { t } = useTranslation('community');
  const { ride, text, photos, author } = post;
  const caption = [author.bike, formatPostTime(new Date(post.createdAt))].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onAuthorPress}
        accessibilityRole="button"
        accessibilityLabel={t('post.authorA11y', { name: author.name })}
        style={styles.header}>
        <ProfileAvatar source={author.avatar} initials={initialsOf(author.name)} size={AVATAR_SIZE} />
        <View style={styles.headerCopy}>
          <Text style={styles.nameRow} numberOfLines={1}>
            <Text style={styles.name}>{author.name}</Text>
            <Text style={styles.handle}>{`  ${t('handle', { handle: author.handle })}`}</Text>
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </Pressable>

      {ride ? (
        <View style={styles.ride}>
          <Text style={styles.rideTitle} numberOfLines={2}>
            {ride.title}
          </Text>
          {ride.description ? <Text style={styles.body}>{ride.description}</Text> : null}
        </View>
      ) : null}

      {text ? <PostText text={text} folded={!ride && photos.length === 0} /> : null}

      {ride ? (
        <View style={styles.ride}>
          <RideTypeBadge type={ride.rideType} />
          <View style={styles.metrics}>
            <Metric label={t('post.metrics.distance')} value={formatDistance(ride.distanceKm, 1)} />
            <Metric label={t('post.metrics.duration')} value={formatDuration(ride.durationMinutes)} />
            {ride.elevationGainM !== undefined ? (
              <Metric label={t('post.metrics.elevation')} value={formatElevation(ride.elevationGainM)} />
            ) : ride.averageSpeedKmh !== undefined ? (
              <Metric label={t('post.metrics.averageSpeed')} value={formatSpeed(ride.averageSpeedKmh)} />
            ) : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaStrip}
            contentContainerStyle={styles.mediaContent}>
            {ride.mapImage ? (
              <Media source={ride.mapImage} width={MAP_WIDTH} label={t('post.map')} />
            ) : null}
            {photos.map((photo, index) => (
              <Media
                key={index}
                source={photo}
                width={PHOTO_WIDTH}
                label={t('post.photo', { index: index + 1 })}
              />
            ))}
          </ScrollView>
        </View>
      ) : photos.length > 0 ? (
        <PhotoCarousel photos={photos} />
      ) : null}

      <View style={styles.actions}>
        <View style={styles.interactions}>
          <CountAction
            icon={post.isLiked ? HeartSolid : Heart}
            count={post.likeCount}
            label={t('post.like')}
            selected={post.isLiked}
            onPress={onLikePress}
          />
          <CountAction
            icon={ChatBubbleEmpty}
            count={post.commentCount}
            label={t('post.comment')}
            onPress={onCommentPress}
          />
        </View>
        <Pressable
          onPress={onSharePress}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('post.share')}
          style={styles.action}>
          <ShareAndroid width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function PostText({ text, folded }: { text: string; folded: boolean }) {
  const { t } = useTranslation('community');
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const limit = folded && !expanded ? TEXT_LINES : undefined;

  return (
    <View style={styles.textBlock}>
      <Text
        style={styles.body}
        numberOfLines={limit}
        onTextLayout={(event) => {
          if (folded && !expanded && event.nativeEvent.lines.length > TEXT_LINES) {
            setOverflows(true);
          }
        }}>
        {text}
      </Text>
      {folded && overflows && !expanded ? (
        <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.more}>{t('post.readMore')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PhotoCarousel({ photos }: { photos: ImageSourcePropType[] }) {
  const { t } = useTranslation('community');
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - layout.screenGutter * 2;
  const [index, setIndex] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));

  return (
    <View style={[styles.carousel, { width, height: width * CAROUSEL_RATIO }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}>
        {photos.map((photo, photoIndex) => (
          <Image
            key={photoIndex}
            source={photo}
            contentFit="cover"
            style={{ width, height: width * CAROUSEL_RATIO }}
            accessibilityLabel={t('post.photo', { index: photoIndex + 1 })}
          />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <View style={styles.counter} pointerEvents="none">
          <Text style={styles.counterLabel}>
            {t('post.photoCounter', { index: index + 1, total: photos.length })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Media({ source, width, label }: { source: ImageSourcePropType; width: number; label: string }) {
  return (
    <View style={[styles.media, { width }]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Image source={source} contentFit="cover" style={styles.mediaImage} />
      <View style={styles.mediaStroke} />
    </View>
  );
}

type CountActionProps = {
  icon: ComponentType<SvgProps>;
  count: number;
  label: string;
  selected?: boolean;
  onPress: () => void;
};

function CountAction({ icon: Icon, count, label, selected, onPress }: CountActionProps) {
  const value = formatNumber(count);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={ACTION_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={styles.action}>
      <Icon width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
      <Text style={styles.count}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameRow: {
    ...typography.bodyMedium,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  handle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  ride: {
    gap: spacing.sm,
  },
  rideTitle: {
    ...typography.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  textBlock: {
    gap: spacing.xs,
  },
  body: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  more: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  metric: {
    width: METRIC_COLUMN_WIDTH,
    flexShrink: 1,
    gap: spacing.xxs,
  },
  metricLabel: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  metricValue: {
    ...typography.metricSmall,
    color: colors.textPrimary,
  },
  mediaStrip: {
    marginHorizontal: -layout.screenGutter,
    marginVertical: -spacing.sm,
  },
  mediaContent: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.sm,
  },
  media: {
    height: MEDIA_HEIGHT,
    borderRadius: radius.md,
    boxShadow: shadows.raised,
    backgroundColor: colors.surfaceMuted,
  },
  mediaImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
  },
  mediaStroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  carousel: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  counter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.mapScrim,
  },
  counterLabel: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textInverse,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  count: {
    ...typography.metricCaption,
    color: colors.textSecondary,
  },
});
