import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/theme';

export type MetricTile = { key: string; value: string; label: string };

const TILE_HEIGHT = 78;

/**
 * Three metric tiles in a bordered card ("Sürüş özeti" on 06.01 and 06.07): value in
 * JetBrains Mono 16 over a 12 pt label.
 */
export function MetricTiles({ tiles }: { tiles: MetricTile[] }) {
  return (
    <View style={styles.card}>
      {tiles.map((tile) => (
        <View key={tile.key} style={styles.tile} accessible accessibilityLabel={`${tile.label}: ${tile.value}`}>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tile: {
    flex: 1,
    height: TILE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
