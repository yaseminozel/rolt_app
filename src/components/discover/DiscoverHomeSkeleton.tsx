import { StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

const CHIP_WIDTHS = [67, 110, 56, 61, 106];
const CARD_COUNT = 3;

/**
 * "Skeleton / Home" (05.01 `CImMS` `spEfx`): static placeholders for the search field, map card,
 * section title, chips and route cards while Home loads. The design draws no animation.
 */
export function DiscoverHomeSkeleton() {
  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.search} />
      <View style={styles.map} />
      <View style={styles.section}>
        <View style={styles.title} />
        <View style={styles.row}>
          {CHIP_WIDTHS.map((width) => (
            <View key={width} style={[styles.chip, { width }]} />
          ))}
        </View>
        <View style={styles.row}>
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardImage} />
              <View style={styles.cardLine} />
              <View style={styles.cardLineShort} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  search: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.skeleton,
  },
  map: {
    height: 206,
    borderRadius: radius.xl,
    backgroundColor: colors.skeleton,
  },
  section: {
    gap: spacing.md,
    marginRight: -layout.screenGutter,
    overflow: 'hidden',
  },
  title: {
    width: 160,
    height: 16,
    borderRadius: radius.xs,
    backgroundColor: colors.skeleton,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    height: 34,
    borderRadius: radius.chip,
    backgroundColor: colors.skeleton,
  },
  card: {
    width: 150,
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  cardImage: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.skeleton,
  },
  cardLine: {
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.skeleton,
  },
  cardLineShort: {
    width: 90,
    height: 12,
    borderRadius: radius.xs,
    backgroundColor: colors.skeleton,
  },
});
