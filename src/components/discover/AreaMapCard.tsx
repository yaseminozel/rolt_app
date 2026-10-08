import { Image } from 'expo-image';
import { MapPin, MapXmark } from 'iconoir-react-native';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { mapFallbacks } from '@/components/map/BaseMap';
import { MapActionButton } from '@/components/map/MapActionButton';
import { useMapExpand } from '@/components/map/MapExpandTransition';
import { exploreInitialView } from '@/features/discover/exploreInitialView';

import { ExpandMapIcon } from './ExpandMapIcon';
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

/** `MapActionButton` takes an SVG component; the design's glyph in the button's ink. */
function ExpandIcon({ width, color }: SvgProps) {
  return <ExpandMapIcon size={Number(width) || 20} color={typeof color === 'string' ? color : colors.textPrimary} />;
}
const PILL_ICON_SIZE = 16;
/** Pill top and button inset inside the card (oxSGl: y 14, 12 pt from the corner). */
const PILL_TOP = 14;
const OFFLINE_ICON_SIZE = 28;

/**
 * "Harita kartı / Bölgedeki rotalar" (05.01 Pencil `wee2e`). The card shows the real Mapbox
 * map: a Static Images picture of exactly the view "Haritada keşfet" (07.01) opens on, cropped
 * around its area. A picture, not a live map, so it never fights the feed's scroll; tapping the
 * card or its corner button (`uVdPv`, the design's enlarge glyph) grows the picture into the
 * screen and the live map takes over on the same frame. Without a Mapbox token (Expo Go) the
 * design artwork stands in.
 */
export function AreaMapCard({ routeCount, onPress, offline }: AreaMapCardProps) {
  const { t } = useTranslation('discover');
  const { expand, activeSource } = useMapExpand();
  const cardRef = useRef<View>(null);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cardWidth, setCardWidth] = useState(0);
  const view = useMemo(
    () =>
      exploreInitialView({
        width: window.width,
        height: window.height,
        insetTop: insets.top,
        insetBottom: insets.bottom,
      }),
    [insets.bottom, insets.top, window.height, window.width],
  );
  const [pictureFailed, setPictureFailed] = useState(false);
  const picture = view && !pictureFailed ? { uri: view.uri } : mapFallbacks.homeCard;
  // Cover scales the screen-sized picture to the card's width; keep its area centred.
  const contentPosition = useMemo(() => {
    if (!view || pictureFailed || cardWidth === 0) {
      return undefined;
    }
    const scale = cardWidth / view.width;
    const offset = CARD_HEIGHT / 2 - view.focusY * scale;
    const range = CARD_HEIGHT - view.height * scale;
    return { top: `${Math.round(Math.min(Math.max(offset / range, 0), 1) * 100)}%` } as const;
  }, [cardWidth, pictureFailed, view]);
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
    icon: ExpandIcon,
    accessibilityLabel: t('home.expandMap'),
    style: styles.locate,
  } as const;
  const open = () =>
    expand(
      {
        ref: cardRef,
        image: picture,
        contentPosition,
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
      onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
      style={[styles.card, activeSource === cardRef && styles.hidden]}>
      <View style={styles.media}>
        <Image
          source={picture}
          placeholder={mapFallbacks.homeCard}
          contentFit="cover"
          contentPosition={contentPosition}
          onError={() => setPictureFailed(true)}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
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
