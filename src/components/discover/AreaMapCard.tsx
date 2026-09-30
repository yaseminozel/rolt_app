import { Image } from 'expo-image';
import { MapPin, MapsArrow, MapsArrowXmark } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type AreaMapCardProps = {
  /** Routes in the region; the pill is hidden while unknown (loading or failed). */
  routeCount: number | undefined;
  /** Location permission granted: the locate button shows "maps-arrow", otherwise "locate-off". */
  locationEnabled: boolean;
  onPress: () => void;
  onLocatePress: () => void;
};

const CARD_HEIGHT = 206;
const PILL_ICON_SIZE = 16;
/** Pill top and button inset inside the card (oxSGl: y 14, 12 pt from the corner). */
const PILL_TOP = 14;

/**
 * "Harita kartı / Bölgedeki rotalar" (p4CIJi `oxSGl`). A static preview on purpose: a live
 * map inside the scrolling feed would fight the scroll gesture (and can't run in Expo Go),
 * so the card shows the design's map artwork and opens "Haritada keşfet" (01.7) on tap.
 */
export function AreaMapCard({ routeCount, locationEnabled, onPress, onLocatePress }: AreaMapCardProps) {
  const { t } = useTranslation('discover');
  const countLabel = routeCount === undefined ? undefined : t('home.areaRouteCount', { count: routeCount });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={countLabel ? `${t('home.exploreMapA11y')}, ${countLabel}` : t('home.exploreMapA11y')}
      style={styles.card}>
      <View style={styles.media}>
        <Image source={mapFallbacks.homeCard} contentFit="cover" style={StyleSheet.absoluteFill} />
        <View style={styles.stroke} />
      </View>
      {countLabel ? (
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <MapPin width={PILL_ICON_SIZE} height={PILL_ICON_SIZE} color={colors.brand} strokeWidth={1.5} />
            <Text style={styles.pillLabel}>{countLabel}</Text>
          </View>
        </View>
      ) : null}
      <MapActionButton
        size="control"
        icon={locationEnabled ? MapsArrow : MapsArrowXmark}
        accessibilityLabel={t('home.goToMyLocation')}
        onPress={onLocatePress}
        style={styles.locate}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Shadow on the outer view, clipping on the inner one (a clipped view would cut its shadow).
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.media,
    boxShadow: shadows.raised,
    backgroundColor: colors.surfaceMuted,
  },
  media: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.media,
    overflow: 'hidden',
  },
  stroke: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.media,
    borderWidth: 1.5,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  pillRow: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapPill,
  },
  pillLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  locate: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
});
