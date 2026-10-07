import { Pause } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

import { StopNumber } from './StopNumber';

type NavigationChipProps =
  | { kind: 'nextStop'; number: number; label: string }
  | { kind: 'break'; title: string; label: string };

/**
 * Small pill under the maneuver card (06.06): "Sonraki durak: Shell · 0,9 km" with the stop number,
 * or the passive "1. durak · Shell / Mola" while standing at a stop (note `O5EZ3F`, no action).
 */
export function NavigationChip(props: NavigationChipProps) {
  if (props.kind === 'nextStop') {
    return (
      <View style={[styles.pill, styles.nextStop]} accessible accessibilityLabel={props.label}>
        <StopNumber number={props.number} />
        <Text style={styles.nextStopLabel} numberOfLines={1}>
          {props.label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.break]} accessible accessibilityLabel={`${props.title}, ${props.label}`}>
      <View style={styles.pauseDisc}>
        <Pause width={18} height={18} color={colors.textPrimary} strokeWidth={1.8} />
      </View>
      <View>
        <Text style={styles.breakTitle}>{props.title}</Text>
        <Text style={styles.breakLabel}>{props.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadows.floatingPill,
  },
  nextStop: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: 10,
    paddingRight: spacing.md,
  },
  nextStopLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  break: {
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: spacing.lg,
  },
  pauseDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  breakTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  breakLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
