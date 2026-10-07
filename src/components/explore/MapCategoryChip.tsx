import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

const CHIP_HEIGHT = 32;
const ICON_SIZE = 16;

type MapCategoryChipProps = {
  label: string;
  icon: ComponentType<SvgProps>;
  selected: boolean;
  onPress?: () => void;
};

/**
 * What the explore map shows (07.01 "Category chips": Rotalar / Benzinlik / Tamirci): a 32 pt
 * chip with a trailing glyph, dark when selected, floating over the map with a shadow.
 */
export function MapCategoryChip({ label, icon: Icon, selected, onPress }: MapCategoryChipProps) {
  const ink = selected ? colors.textInverse : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      hitSlop={{
        top: (layout.minTouchTarget - CHIP_HEIGHT) / 2,
        bottom: (layout.minTouchTarget - CHIP_HEIGHT) / 2,
      }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.default,
        pressed && !selected && styles.pressed,
      ]}>
      <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon width={ICON_SIZE} height={ICON_SIZE} color={ink} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.chip,
    boxShadow: shadows.mapChip,
  },
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  label: {
    ...typography.bodyMedium,
  },
});
