import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/theme';

/** Side of the bubble the arrow sits on (the anchor is on that side). */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  /** Short label or multi-line message; long text wraps inside a 320 pt bubble. */
  label: string;
  /** Arrow side, not the side of the anchor the tooltip appears on. Defaults to `top`. */
  placement?: TooltipPlacement;
  showArrow?: boolean;
};

const ARROW_LENGTH = 8;
const ARROW_BASE = 16;
const MAX_WIDTH = 320;

const ARROW_POINTS: Record<TooltipPlacement, string> = {
  top: `0,${ARROW_LENGTH} ${ARROW_BASE / 2},0 ${ARROW_BASE},${ARROW_LENGTH}`,
  bottom: `0,0 ${ARROW_BASE},0 ${ARROW_BASE / 2},${ARROW_LENGTH}`,
  left: `${ARROW_LENGTH},0 0,${ARROW_BASE / 2} ${ARROW_LENGTH},${ARROW_BASE}`,
  right: `0,0 ${ARROW_LENGTH},${ARROW_BASE / 2} 0,${ARROW_BASE}`,
};

/**
 * Tooltip (Pencil `u7cV7`): presentational bubble with an optional centered arrow.
 * Positioning relative to an anchor is left to the caller; `placement` only picks the arrow side.
 */
export function Tooltip({ label, placement = 'top', showArrow = true }: TooltipProps) {
  const vertical = placement === 'top' || placement === 'bottom';
  const arrowFirst = placement === 'top' || placement === 'left';

  const arrow = showArrow ? (
    <Svg
      width={vertical ? ARROW_BASE : ARROW_LENGTH}
      height={vertical ? ARROW_LENGTH : ARROW_BASE}
      style={arrowOverlap[placement]}
    >
      <Polygon points={ARROW_POINTS[placement]} fill={colors.surfaceInverse} />
    </Svg>
  ) : null;

  return (
    <View
      accessibilityRole="text"
      style={[styles.container, { flexDirection: vertical ? 'column' : 'row' }]}
    >
      {arrowFirst ? arrow : null}
      <View style={styles.bubble}>
        <Text style={styles.label}>{label}</Text>
      </View>
      {arrowFirst ? null : arrow}
    </View>
  );
}

// The design overlaps the arrow with the bubble by 1 pt so no seam shows.
const arrowOverlap = StyleSheet.create({
  top: { marginBottom: -1 },
  bottom: { marginTop: -1 },
  left: { marginRight: -1 },
  right: { marginLeft: -1 },
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  bubble: {
    flexShrink: 1,
    maxWidth: MAX_WIDTH,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInverse,
  },
  label: {
    ...typography.body,
    color: colors.textInverse,
    textAlign: 'center',
  },
});
