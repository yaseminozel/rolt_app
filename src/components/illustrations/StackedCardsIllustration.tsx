import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows } from '@/theme';

const CARD = { width: 233, height: 64 };
const BAR_LONG = { width: 118, height: 13 };
const BAR_SHORT = { width: 78, height: 9 };

type CardSpec = {
  /** Centre of the card in the 361 × 190 canvas. */
  centerX: number;
  centerY: number;
  /** Clockwise degrees (the design's counter-clockwise rotation, negated). */
  rotate: number;
  opacity: number;
  tile: string;
  barLong: string;
  barShort: string;
  barGap: number;
  shadow?: boolean;
};

/** "Silüet / Motor yığını" (Pencil `dCCN1`, `ZwHY6`): back, right and front cards. */
const CARDS: CardSpec[] = [
  {
    centerX: 166.5,
    centerY: 58,
    rotate: 0,
    opacity: 0.7,
    tile: colors.stackBackTile,
    barLong: colors.stackBackBarLong,
    barShort: colors.stackBackBarShort,
    barGap: 8,
  },
  {
    centerX: 208,
    centerY: 107,
    rotate: 7.54,
    opacity: 0.85,
    tile: colors.stackRightTile,
    barLong: colors.stackRightBarLong,
    barShort: colors.stackRightBarShort,
    barGap: 2,
  },
  {
    centerX: 151.5,
    centerY: 126,
    rotate: -3.5,
    opacity: 1,
    tile: colors.stackFrontTile,
    barLong: colors.stackFrontBarLong,
    barShort: colors.stackFrontBarShort,
    barGap: 8,
    shadow: true,
  },
];

/**
 * Three placeholder cards stacked at angles: the shared empty-state picture of Motorum
 * (11.01), the community feed (13.01) and its search (13.04 "Sonuç yok").
 */
export function StackedCardsIllustration() {
  return (
    <View style={styles.canvas} importantForAccessibility="no-hide-descendants">
      {CARDS.map((card, index) => (
        <View
          key={index}
          style={[
            styles.card,
            card.shadow && styles.shadow,
            {
              left: card.centerX - CARD.width / 2,
              top: card.centerY - CARD.height / 2,
              opacity: card.opacity,
              transform: [{ rotate: `${card.rotate}deg` }],
            },
          ]}>
          <View style={[styles.tile, { backgroundColor: card.tile }]} />
          <View style={[styles.bars, { gap: card.barGap }]}>
            <View style={[styles.barLong, { backgroundColor: card.barLong }]} />
            <View style={[styles.barShort, { backgroundColor: card.barShort }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: 361,
    height: 190,
    alignSelf: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD.width,
    height: CARD.height,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shadow: {
    boxShadow: shadows.stackFront,
  },
  tile: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: radius.chip,
  },
  bars: {
    position: 'absolute',
    left: 62,
    top: 15.5,
  },
  barLong: {
    width: BAR_LONG.width,
    height: BAR_LONG.height,
    borderRadius: BAR_LONG.height / 2,
  },
  barShort: {
    width: BAR_SHORT.width,
    height: BAR_SHORT.height,
    borderRadius: BAR_SHORT.height / 2,
  },
});
