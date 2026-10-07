import { Image } from 'expo-image';
import { Enlarge, MapPin, MapXmark } from 'iconoir-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { useMapExpand } from '@/components/map/MapExpandTransition';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type AreaMapCardProps = {
  /** Routes in the region; the pill is hidden while unknown (loading or failed). */
  routeCount: number | undefined;
  /**
   * Opens "Haritada keşfet" (07.01); the card and its "Haritayı genişlet" button both do, the
   * card growing into the map (`MapExpandTransition`).
   */
  onPress: () => void;
  /** No connection: the map can't load, so a muted layer explains it (05.01 `INwLr`). */
  offline?: { title: string; description: string };
};

const CARD_HEIGHT = 206;
const PILL_ICON_SIZE = 16;
/** Pill top and button inset inside the card (oxSGl: y 14, 12 pt from the corner). */
const PILL_TOP = 14;
const OFFLINE_ICON_SIZE = 28;

/**
 * "Harita kartı / Bölgedeki rotalar" (p4CIJi `oxSGl`). A static preview on purpose: a live
 * map inside the scrolling feed would fight the scroll gesture (and can't run in Expo Go),
 * so the card shows the design's map artwork and opens "Haritada keşfet" (07.01) on tap; the
 * corner button is "Haritayı genişlet" (05.01 `H8ChY`, maximize-2 → Iconoir `Enlarge`).
 */
export function AreaMapCard({ routeCount, onPress, offline }: AreaMapCardProps) {
  const { t } = useTranslation('discover');
  const { expand, activeSource } = useMapExpand();
  const cardRef = useRef<View>(null);
  const countLabel =
    routeCount === undefined ? undefined : t('home.areaRouteCount', { count: routeCount });

  if (offline) {
    return (
      <View style={[styles.card, styles.offline]} accessibilityRole="summary">
        <MapXmark
          width={OFFLINE_ICON_SIZE}
          height={OFFLINE_ICON_SIZE}
          color={colors.textPrimary}
          strokeWidth={1.5}
        />
        <Text style={styles.offlineTitle}>{offline.title}</Text>
        <Text style={styles.offlineText}>{offline.description}</Text>
      </View>
    );
  }

  const pill = countLabel ? (
    <View style={styles.pillRow}>
      <View style={styles.pill}>
        <MapPin
          width={PILL_ICON_SIZE}
          height={PILL_ICON_SIZE}
          color={colors.brand}
          strokeWidth={1.5}
        />
        <Text style={styles.pillLabel}>{countLabel}</Text>
      </View>
    </View>
  ) : null;
  const button = {
    size: 'control',
    icon: Enlarge,
    accessibilityLabel: t('home.expandMap'),
    style: styles.locate,
  } as const;
  const open = () =>
    expand(
      {
        ref: cardRef,
        image: mapFallbacks.homeCard,
        decorations: (
          <>
            {pill}
            <MapActionButton {...button} />
          </>
        ),
      },
      onPress,
    );

  return (
    <Pressable
      ref={cardRef}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={
        countLabel ? `${t('home.exploreMapA11y')}, ${countLabel}` : t('home.exploreMapA11y')
      }
      // Under its growing clone while the map opens or closes.
      style={[styles.card, activeSource === cardRef && styles.hidden]}>
      <View style={styles.media}>
        <Image source={mapFallbacks.homeCard} contentFit="cover" style={StyleSheet.absoluteFill} />
        <View style={styles.stroke} />
      </View>
      {pill}
      <MapActionButton {...button} onPress={open} />
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
  hidden: {
    opacity: 0,
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
  // "Çevrimdışı katmanı": icon 28, 8 pt to the title, 8 pt to the hint.
  offline: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    boxShadow: 'none',
  },
  offlineTitle: {
    ...typography.bodySemibold,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  offlineText: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  locate: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
});
