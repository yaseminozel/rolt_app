import { NavArrowDown } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type SelectFieldProps = {
  value: string;
  /** Leading 20 pt glyph, e.g. the ride type icon. */
  leading?: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** Grey prompt while `value` is empty (10.16 "Bir neden seç"). */
  placeholder?: string;
};

/**
 * Input-styled picker that opens a sheet (08.05 "Sürüş tipi": 44 pt field, leading icon,
 * value and a chevron down). Same frame as `TextField`.
 */
export function SelectField({
  value,
  leading,
  onPress,
  accessibilityLabel,
  disabled,
  placeholder,
}: SelectFieldProps) {
  const empty = !value && Boolean(placeholder);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${value || placeholder || ''}`}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
      {leading}
      <Text style={[styles.value, empty && styles.placeholder]} numberOfLines={1}>
        {empty ? placeholder : value}
      </Text>
      <NavArrowDown width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  value: {
    ...typography.bodyLarge,
    lineHeight: 24,
    flex: 1,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textTertiary,
  },
});
