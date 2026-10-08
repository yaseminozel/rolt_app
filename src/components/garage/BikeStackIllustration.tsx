import { Motorcycle } from 'iconoir-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

/** One silhouette card: a motorcycle tile and two placeholder lines. */
function SilhouetteCard({ width, rotate, style }: { width: number; rotate: string; style: object }) {
  return (
    <View style={[styles.card, { width, transform: [{ rotate }] }, style]}>
      <View style={styles.tile}>
        <Motorcycle width={24} height={24} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <View style={styles.lines}>
        <View style={[styles.line, styles.lineLong]} />
        <View style={[styles.line, styles.lineShort]} />
      </View>
    </View>
  );
}

/**
 * "Silüet / Motor yığını" (11.01 `1005:38332`): three motorcycle cards stacked at angles, the
 * empty garage. Drawn from the frame's card positions (back, right, front).
 */
export function BikeStackIllustration() {
  return (
    <View style={styles.canvas} importantForAccessibility="no-hide-descendants">
      <SilhouetteCard width={228} rotate="-4deg" style={styles.back} />
      <SilhouetteCard width={232} rotate="6deg" style={styles.right} />
      <SilhouetteCard width={232} rotate="-2deg" style={styles.front} />
    </View>
  );
}

const CARD_HEIGHT = 60;

const styles = StyleSheet.create({
  canvas: {
    width: 361,
    height: 190,
    alignSelf: 'center',
  },
  card: {
    position: 'absolute',
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: shadows.stackedCard,
  },
  // Bounding boxes in the frame (Group 5 at 33, 26): back 83,52; right 129,86; front 66,127.
  back: {
    left: 85,
    top: 54,
    opacity: 0.6,
  },
  right: {
    left: 100,
    top: 98,
    opacity: 0.8,
  },
  front: {
    left: 66,
    top: 128,
  },
  tile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
  line: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  lineLong: {
    width: '80%',
  },
  lineShort: {
    width: '50%',
  },
});
