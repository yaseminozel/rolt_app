import { BlurView } from 'expo-blur';
import { Bookmark, BookmarkSolid, Clock, DashboardSpeed, PathArrow } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Badge } from '@/components/ui/Badge';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

const COMPACT_WIDTH = 150;
const SAVE_BUTTON_SIZE = 30;
/** expo-blur intensity approximating the design's 5.25 px background blur. */
const SAVE_BUTTON_BLUR_INTENSITY = 20;
/** Accessible name of the bookmark action ("Kaydet" frame in the design). */
const SAVE_LABEL = 'Kaydet';

type RouteCardBaseProps = {
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
  /** Pre-formatted distance, e.g. "72 km". */
  distance: string;
  /** Pre-formatted duration, e.g. "1 sa 25 dk". */
  duration: string;
  onPress?: () => void;
  /** Bookmark state; the save action is shown only when `onToggleSave` is given. */
  saved?: boolean;
  onToggleSave?: () => void;
  style?: StyleProp<ViewStyle>;
};

type CompactRouteCardProps = RouteCardBaseProps & {
  variant: 'compact';
  /** Optional category label over the image, e.g. "Virajlı" (success-tone `Badge`, no icon). */
  badgeLabel?: string;
  averageSpeed?: never;
};

type RowRouteCardProps = RouteCardBaseProps & {
  variant: 'row';
  /** Pre-formatted average speed, e.g. "51 km/sa". */
  averageSpeed?: string;
  badgeLabel?: never;
};

export type RouteCardProps = CompactRouteCardProps | RowRouteCardProps;

/**
 * Route discovery card. Pencil node `gBNKs`:
 * `compact` = "Card / Rota — Kompakt" (150 × 191, image on top, optional badge and bookmark),
 * `row` = "Card / Rota — Satır" (361 × 85, thumbnail, metrics, bookmark and bottom divider).
 */
export function RouteCard(props: RouteCardProps) {
  return props.variant === 'compact' ? <CompactRouteCard {...props} /> : <RowRouteCard {...props} />;
}

function CompactRouteCard({
  image,
  title,
  subtitle,
  distance,
  duration,
  badgeLabel,
  saved = false,
  onToggleSave,
  onPress,
  style,
}: CompactRouteCardProps) {
  const BookmarkIcon = saved ? BookmarkSolid : Bookmark;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      style={[styles.compact, style]}>
      <View style={styles.compactMedia}>
        <Image source={image} resizeMode="cover" style={styles.compactImage} />
        <View style={styles.compactImageStroke} />
        {badgeLabel ? (
          <View style={styles.badge}>
            <Badge tone="success" size="small" label={badgeLabel} showIcon={false} />
          </View>
        ) : null}
        {onToggleSave ? (
          <Pressable
            onPress={onToggleSave}
            hitSlop={(layout.minTouchTarget - SAVE_BUTTON_SIZE) / 2}
            accessibilityRole="button"
            accessibilityLabel={SAVE_LABEL}
            accessibilityState={{ selected: saved }}
            style={styles.compactSaveButton}>
            {/* Design: background blur 5.25 behind the scrim-tinted "Favori" button. */}
            <BlurView intensity={SAVE_BUTTON_BLUR_INTENSITY} style={StyleSheet.absoluteFill} />
            <BookmarkIcon width={16} height={16} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.info}>
        <View style={styles.heading}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.metrics, styles.compactMetrics]}>
          <Metric icon={PathArrow} value={distance} textStyle={styles.compactMetricValue} />
          <Metric icon={Clock} value={duration} textStyle={styles.compactMetricValue} />
        </View>
      </View>
    </Pressable>
  );
}

function RowRouteCard({
  image,
  title,
  subtitle,
  distance,
  duration,
  averageSpeed,
  saved = false,
  onToggleSave,
  onPress,
  style,
}: RowRouteCardProps) {
  const BookmarkIcon = saved ? BookmarkSolid : Bookmark;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      style={[styles.row, style]}>
      <View style={styles.rowContent}>
        <View style={styles.rowMedia}>
          <Image source={image} resizeMode="cover" style={styles.rowImage} />
          <View style={styles.rowImageStroke} />
        </View>
        <View style={[styles.info, styles.rowInfo]}>
          <View style={styles.heading}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <View style={[styles.metrics, styles.rowMetrics]}>
            <Metric icon={PathArrow} value={distance} textStyle={styles.rowMetricValue} />
            <Metric icon={Clock} value={duration} textStyle={styles.rowMetricValue} />
            {averageSpeed ? (
              <Metric icon={DashboardSpeed} value={averageSpeed} textStyle={styles.rowMetricValue} />
            ) : null}
          </View>
        </View>
        {onToggleSave ? (
          <Pressable
            onPress={onToggleSave}
            hitSlop={{ top: 4, bottom: 4, left: spacing.md, right: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel={SAVE_LABEL}
            accessibilityState={{ selected: saved }}
            style={styles.rowSaveButton}>
            <BookmarkIcon width={20} height={20} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.divider} />
    </Pressable>
  );
}

type MetricProps = {
  icon: ComponentType<SvgProps>;
  value: string;
  textStyle: StyleProp<TextStyle>;
};

function Metric({ icon: Icon, value, textStyle }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Icon width={14} height={14} color={colors.textPrimary} />
      <Text style={textStyle} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact
  compact: {
    width: COMPACT_WIDTH,
    gap: 10,
  },
  compactMedia: {
    height: 120,
    borderRadius: radius.md,
    boxShadow: shadows.raised,
  },
  compactImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  compactImageStroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  badge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },
  compactSaveButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: SAVE_BUTTON_SIZE,
    height: SAVE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
    overflow: 'hidden',
  },
  compactTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  compactMetrics: {
    gap: 10,
    paddingTop: spacing.xxs,
  },
  compactMetricValue: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },

  // Row
  row: {
    gap: spacing.lg,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMedia: {
    width: 84,
    height: 68,
    borderRadius: radius.chip,
    boxShadow: shadows.raised,
  },
  rowImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    borderRadius: radius.chip,
  },
  rowImageStroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  rowMetrics: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  rowMetricValue: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  rowSaveButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Shared
  info: {
    gap: spacing.xs,
  },
  heading: {
    gap: spacing.xxs,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
