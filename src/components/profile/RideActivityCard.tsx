import { Image } from 'expo-image';
import {
  Bookmark,
  BookmarkSolid,
  ChatBubbleEmpty,
  Heart,
  HeartSolid,
  MoreVert,
  ShareIos,
} from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { RideTypeBadge } from '@/components/ride/RideTypeBadge';
import type { RideType } from '@/features/rides/rideTypes';
import { formatNumber } from '@/i18n/format';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

import { ProfileAvatar } from './ProfileAvatar';

const AVATAR_SIZE = 36;
const ACTION_ICON_SIZE = 20;
/** Metric columns are 96 pt wide with a 2 pt gap ("Ride Metrics"). */
const METRIC_COLUMN_WIDTH = 96;
const MAP_WIDTH = 240;
const PHOTO_WIDTH = 86;
const MEDIA_HEIGHT = 100;
const MEDIA_STROKE_WIDTH = 1.5;
/** Icon → count gap in the action row ("Aksiyon / Beğen" gap 6). */
const COUNT_GAP = 6;
/** Grows the 28 pt action rows to a 44 pt touch target. */
const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

export type RideActivityMetrics = {
  /** Pre-formatted values, e.g. "12,8 km", "1 sa 28 dk", "50 km/sa". */
  distance: string;
  duration: string;
  averageSpeed: string;
};

type RideActivityCardProps = {
  riderName: string;
  riderAvatar?: ImageSourcePropType;
  /** Pre-formatted start date, e.g. "12 Eyl 2026, 19:30". */
  date: string;
  title: string;
  rideType: RideType;
  metrics: RideActivityMetrics;
  mapImage: ImageSourcePropType;
  photos: ImageSourcePropType[];
  likeCount: number;
  commentCount: number;
  saveCount: number;
  liked: boolean;
  saved: boolean;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSavePress: () => void;
  onSharePress: () => void;
  /** "⋮" menu; hidden when omitted. */
  onMorePress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ride activity card in profile feeds ("ROLT UI/Frame 46", gKG8D / Dimdp): rider row with a
 * menu, title, ride type, Mono metrics, a static map thumbnail followed by photos in a
 * horizontal strip that bleeds to the screen edge, and like / comment / save / share actions.
 */
export function RideActivityCard({
  riderName,
  riderAvatar,
  date,
  title,
  rideType,
  metrics,
  mapImage,
  photos,
  likeCount,
  commentCount,
  saveCount,
  liked,
  saved,
  onLikePress,
  onCommentPress,
  onSavePress,
  onSharePress,
  onMorePress,
  style,
}: RideActivityCardProps) {
  const { t } = useTranslation('profile');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.rider}>
          <ProfileAvatar source={riderAvatar} size={AVATAR_SIZE} />
          <View style={styles.riderCopy}>
            <Text style={styles.riderName} numberOfLines={1}>
              {riderName}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {date}
            </Text>
          </View>
        </View>
        {onMorePress ? (
          <Pressable
            onPress={onMorePress}
            accessibilityRole="button"
            accessibilityLabel={t('activity.more')}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
            <MoreVert width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <RideTypeBadge type={rideType} />
        <View style={styles.metrics}>
          <Metric label={t('activity.metrics.distance')} value={metrics.distance} />
          <Metric label={t('activity.metrics.duration')} value={metrics.duration} />
          <Metric label={t('activity.metrics.averageSpeed')} value={metrics.averageSpeed} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaStrip}
          contentContainerStyle={styles.mediaContent}>
          <Media source={mapImage} width={MAP_WIDTH} accessibilityLabel={t('activity.map')} />
          {photos.map((photo, index) => (
            <Media
              // Photos have no ids yet; their order is stable for a ride.
              key={index}
              source={photo}
              width={PHOTO_WIDTH}
              accessibilityLabel={t('activity.photo', { index: index + 1 })}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <View style={styles.interactions}>
          <CountAction
            icon={liked ? HeartSolid : Heart}
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
          <CountAction
            icon={saved ? BookmarkSolid : Bookmark}
            count={saveCount}
            label={t('activity.save')}
            selected={saved}
            onPress={onSavePress}
          />
        </View>
        <Pressable
          onPress={onSharePress}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('activity.share')}
          style={styles.action}>
          <ShareIos width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
        </Pressable>
      </View>
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
  width,
  accessibilityLabel,
}: {
  source: ImageSourcePropType;
  width: number;
  accessibilityLabel: string;
}) {
  return (
    <View style={[styles.media, { width }]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rider: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  riderCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  riderName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  // Design frame is 36 pt ("Action / Duraklat") with the icon centered 18 pt from the card edge;
  // the 44 pt target keeps that center.
  moreButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    marginVertical: -(layout.minTouchTarget - AVATAR_SIZE) / 2,
    marginRight: -(layout.minTouchTarget - AVATAR_SIZE) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  details: {
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
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
  // Bleeds to the screen edges so photos scroll out of view instead of being clipped by the gutter.
  mediaStrip: {
    marginHorizontal: -layout.screenGutter,
    // Room for the media shadow, which the scroll view would otherwise clip.
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
    borderWidth: MEDIA_STROKE_WIDTH,
    borderColor: colors.surface,
    pointerEvents: 'none',
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
    gap: COUNT_GAP,
    paddingVertical: spacing.xs,
  },
  count: {
    ...typography.metricCaption,
    color: colors.textSecondary,
  },
});
