import { Image } from 'expo-image';
import { ChatBubbleEmpty, Heart, HeartSolid, Plus, ShareAndroid } from 'iconoir-react-native';
import { useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { RideTypeBadge } from '@/components/ride/RideTypeBadge';
import type { CommunityPost, PostRide } from '@/features/community/types';
import {
  formatCompactDuration,
  formatDistance,
  formatNumber,
  formatPostTime,
  formatSpeed,
} from '@/i18n/format';
import { initialsOf } from '@/lib/initials';
import { avatarTone, colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const AVATAR_SIZE = 40;
const BADGE_SIZE = 12;
const ACTION_ICON_SIZE = 20;
const MAP_WIDTH = 240;
const PHOTO_WIDTH = 86;
const MEDIA_HEIGHT = 100;
const CAROUSEL_HEIGHT = 270;
const DOT_SIZE = 6;
/** Text-only posts fold after this many lines with "Devamını gör" (`f4cJS`: 8 lines). */
const TEXT_LINES = 8;
const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

type CommunityPostCardProps = {
  post: CommunityPost;
  onAuthorPress: () => void;
  /** "+" on the avatar of riders the viewer doesn't follow ("Takip et rozeti"). */
  onFollowPress?: () => void;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  /** Opens the shared ride (09.06) when the post links one; the ride block isn't tappable otherwise. */
  onRidePress?: () => void;
};

/**
 * A community post (13.01 "Post / …", Pencil `qt8Xk`, `f4cJS`, `PqGi6`, `SEtAW`): a 40 pt token
 * avatar (with a "+" when not followed), name and @handle over bike · time, then the shared
 * content — a ride (title, note, type, distance / time / speed / bends, map or map + photos),
 * text folded after eight lines, or a 270 pt photo carousel with "1/4" and page dots — and
 * like (red when liked), comment and share.
 */
export function CommunityPostCard({
  post,
  onAuthorPress,
  onFollowPress,
  onLikePress,
  onCommentPress,
  onSharePress,
  onRidePress,
}: CommunityPostCardProps) {
  const { t } = useTranslation('community');
  const { ride, text, photos, author } = post;
  const caption = [author.bike, formatPostTime(new Date(post.createdAt))].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onAuthorPress}
          accessibilityRole="button"
          accessibilityLabel={t('post.authorA11y', { name: author.name })}
          style={styles.author}>
          <View style={styles.avatarArea}>
            <ProfileAvatar
              source={author.avatar}
              initials={initialsOf(author.name)}
              tone={avatarTone(author.id)}
              size={AVATAR_SIZE}
            />
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {author.name}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                {t('handle', { handle: author.handle })}
              </Text>
            </View>
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </Pressable>
        {!post.isFollowingAuthor && onFollowPress ? (
          <Pressable
            onPress={onFollowPress}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t('post.follow', { name: author.name })}
            style={styles.followBadge}>
            <Plus width={10} height={10} color={colors.textInverse} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      {ride ? <PostRideBlock ride={ride} photos={photos} onPress={onRidePress} /> : null}

      {!ride && text ? <PostText text={text} folded={photos.length === 0} /> : null}
      {!ride && photos.length > 0 ? <PhotoCarousel photos={photos} /> : null}

      <View style={styles.actions}>
        <View style={styles.interactions}>
          <CountAction
            icon={post.isLiked ? HeartSolid : Heart}
            iconColor={post.isLiked ? colors.like : colors.textPrimary}
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

type PostRideBlockProps = {
  ride: PostRide;
  /** The post's photos, after the map in a strip that bleeds to the screen edge. */
  photos: readonly ImageSourcePropType[];
  /** Makes the whole block open the ride. */
  onPress?: () => void;
  /** Next to the title, e.g. the composer's remove button. */
  trailing?: ReactNode;
};

/**
 * The shared ride of a post ("Sürüş / rota paylaşımı"): title and note, ride type, distance /
 * time / speed / bends, and the map picture (alone, wide) or the map followed by photos. Also
 * shows the ride attached in the composer.
 */
export function PostRideBlock({ ride, photos, onPress, trailing }: PostRideBlockProps) {
  const { t } = useTranslation('community');
  const content = (
    <>
      <View style={styles.rideHeading}>
        <View style={styles.rideCopy}>
          <Text style={styles.rideTitle} numberOfLines={2}>
            {ride.title}
          </Text>
          {ride.description ? <Text style={styles.rideNote}>{ride.description}</Text> : null}
        </View>
        {trailing}
      </View>
      <RideTypeBadge type={ride.rideType} />
      <View style={styles.metrics}>
        <Metric label={t('post.metrics.distance')} value={formatDistance(ride.distanceKm, 1)} />
        <Metric
          label={t('post.metrics.duration')}
          value={formatCompactDuration(ride.durationMinutes)}
        />
        {ride.averageSpeedKmh !== undefined ? (
          <Metric label={t('post.metrics.averageSpeed')} value={formatSpeed(ride.averageSpeedKmh)} />
        ) : null}
        {ride.curveCount !== undefined ? (
          <Metric label={t('post.metrics.curves')} value={formatNumber(ride.curveCount)} />
        ) : null}
      </View>
      {photos.length === 0 && ride.mapImage ? (
        <Media source={ride.mapImage} label={t('post.map')} style={styles.mapWide} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaStrip}
          contentContainerStyle={styles.mediaContent}>
          {ride.mapImage ? (
            <Media source={ride.mapImage} label={t('post.map')} style={{ width: MAP_WIDTH }} />
          ) : null}
          {photos.map((photo, index) => (
            <Media
              key={index}
              source={photo}
              label={t('post.photo', { index: index + 1 })}
              style={{ width: PHOTO_WIDTH }}
            />
          ))}
        </ScrollView>
      )}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={t('post.openRide')}
      style={({ pressed }) => [styles.ride, pressed && styles.ridePressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.ride}>{content}</View>
  );
}

function PostText({ text, folded }: { text: string; folded: boolean }) {
  const { t } = useTranslation('community');
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  return (
    <View style={styles.textBlock}>
      <Text
        style={styles.body}
        numberOfLines={folded && !expanded ? TEXT_LINES : undefined}
        onTextLayout={(event) => {
          if (folded && !expanded && event.nativeEvent.lines.length >= TEXT_LINES) {
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
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    width > 0 && setIndex(Math.round(event.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.carouselBlock}>
      <View style={styles.carousel} onLayout={onLayout}>
        {width > 0 ? (
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
                style={{ width, height: CAROUSEL_HEIGHT }}
                accessibilityLabel={t('post.photo', { index: photoIndex + 1 })}
              />
            ))}
          </ScrollView>
        ) : null}
        {photos.length > 1 ? (
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterLabel}>
              {t('post.photoCounter', { index: index + 1, total: photos.length })}
            </Text>
          </View>
        ) : null}
      </View>
      {photos.length > 1 ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {photos.map((_, dotIndex) => (
            <View key={dotIndex} style={[styles.dot, dotIndex === index && styles.dotActive]} />
          ))}
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

function Media({
  source,
  label,
  style,
}: {
  source: ImageSourcePropType;
  label: string;
  style: object;
}) {
  return (
    <View style={[styles.media, style]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Image source={source} contentFit="cover" style={styles.mediaImage} />
      <View style={styles.mediaStroke} />
    </View>
  );
}

type CountActionProps = {
  icon: ComponentType<SvgProps>;
  iconColor?: string;
  count: number;
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Like / comment / save glyph with its count (Mono); without `onPress` it only shows the count. */
export function CountAction({
  icon: Icon,
  iconColor = colors.textPrimary,
  count,
  label,
  selected,
  onPress,
}: CountActionProps) {
  const value = formatNumber(count);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={ACTION_HIT_SLOP}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityState={selected === undefined ? undefined : { selected }}
      disabled={!onPress}
      style={styles.action}>
      <Icon width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={iconColor} />
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
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarArea: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  followBadge: {
    position: 'absolute',
    left: 28,
    top: 28,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  handle: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  ride: {
    gap: spacing.md,
  },
  ridePressed: {
    opacity: 0.85,
  },
  rideHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rideCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rideTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  rideNote: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  textBlock: {
    gap: spacing.xs,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  more: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  metric: {
    flex: 1,
    gap: spacing.xxs,
  },
  metricLabel: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  metricValue: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  mapWide: {
    alignSelf: 'stretch',
  },
  mediaStrip: {
    marginHorizontal: -layout.screenGutter,
  },
  mediaContent: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  media: {
    height: MEDIA_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  mediaImage: {
    ...StyleSheet.absoluteFill,
  },
  mediaStroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  carouselBlock: {
    gap: spacing.sm,
  },
  carousel: {
    height: CAROUSEL_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  counter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
  },
  counterLabel: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textInverse,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.textSecondary,
  },
  dotActive: {
    backgroundColor: colors.textPrimary,
  },
  actions: {
    height: 32,
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
    fontFamily: fontFamily.monoMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
