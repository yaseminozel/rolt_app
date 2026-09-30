import { Image } from 'expo-image';
import { Bookmark, BookmarkSolid, Clock, Navigator, PathArrow, Play, Xmark } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { MountainIcon } from '@/components/registration/icons/MountainIcon';
import { Button } from '@/components/ui/Button';
import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration, formatElevation, formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

import { RouteTagPill } from './RouteTagPill';

const CARD_PADDING = 14;
const IMAGE_SIZE = 88;
const IMAGE_RADIUS = 14;
const CLOSE_SIZE = 28;
const ACTION_HEIGHT = 48;
const METRIC_ICON_SIZE = 14;

type RoutePreviewCardProps = {
  route: Route;
  /** Distance from the rider (or the city centre) to the nearest point of the route. */
  distanceAwayKm: number | null;
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onViewDetails: () => void;
  onStartRide: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Rota önizleme kartı" (01.7 "Rota seçili" `SIrGF`): replaces the list sheet while a route
 * is selected on the map. Photo, tag, name, author with rating, four metrics and the
 * bookmark / "Detayı gör" / "Sürmeye başla" actions.
 */
export function RoutePreviewCard({
  route,
  distanceAwayKm,
  saved,
  onToggleSave,
  onClose,
  onViewDetails,
  onStartRide,
  onLayout,
  style,
}: RoutePreviewCardProps) {
  const { t } = useTranslation(['explore', 'common']);
  const rating = formatNumber(route.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const ratingCount = formatNumber(route.ratingCount);
  const BookmarkIcon = saved ? BookmarkSolid : Bookmark;

  const metrics: { key: string; icon: ComponentType<SvgProps>; value: string }[] = [
    { key: 'distance', icon: PathArrow, value: formatDistance(route.distanceKm) },
    { key: 'duration', icon: Clock, value: formatDuration(route.durationMinutes) },
    { key: 'elevation', icon: MountainIcon, value: formatElevation(route.elevationGainM) },
  ];
  if (distanceAwayKm !== null) {
    metrics.push({
      key: 'away',
      icon: Navigator,
      value: t('preview.away', { distance: formatDistance(distanceAwayKm, distanceAwayKm < 10 ? 1 : 0) }),
    });
  }

  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      <View style={styles.top}>
        <Image source={route.coverImage} contentFit="cover" style={styles.image} accessibilityIgnoresInvertColors />
        <View style={styles.text}>
          <RouteTagPill tag={route.tag} />
          <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
            {route.name}
          </Text>
          <Text
            style={styles.author}
            numberOfLines={1}
            accessibilityLabel={t('preview.a11yRating', { author: route.author.name, rating, count: route.ratingCount })}>
            {t('preview.authorRating', { author: route.author.name, rating, count: ratingCount })}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common:actions.close')}
          hitSlop={(layout.minTouchTarget - CLOSE_SIZE) / 2}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <Xmark width={14} height={14} color={colors.textBody} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.metrics}>
        {metrics.map(({ key, icon: Icon, value }) => (
          <View key={key} style={styles.metric}>
            <Icon width={METRIC_ICON_SIZE} height={METRIC_ICON_SIZE} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.metricValue} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleSave}
          accessibilityRole="button"
          accessibilityLabel={t('common:actions.save')}
          accessibilityState={{ selected: saved }}
          style={({ pressed }) => [styles.bookmark, pressed && styles.bookmarkPressed]}>
          <BookmarkIcon width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
        <Button
          label={t('preview.viewDetails')}
          variant="outlined"
          size="lg"
          onPress={onViewDetails}
          style={styles.actionButton}
        />
        <Button label={t('preview.startRide')} icon={Play} size="lg" onPress={onStartRide} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_PADDING,
    padding: CARD_PADDING,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapCard,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_RADIUS,
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  author: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  closePressed: {
    backgroundColor: colors.surfacePressed,
  },
  metrics: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  metricValue: {
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  bookmark: {
    width: ACTION_HEIGHT,
    height: ACTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookmarkPressed: {
    backgroundColor: colors.surfacePressed,
  },
  // Two equal buttons share the row, so the standard 24–32 pt side padding is reduced.
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});
