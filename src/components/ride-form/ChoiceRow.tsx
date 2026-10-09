import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { RadioButton } from '@/components/ui/RadioButton';
import { withHaptic } from '@/features/haptics/haptics';
import { colors, fontFamily, spacing } from '@/theme';

type ChoiceRowProps = {
  label: string;
  description?: string;
  icon?: ComponentType<SvgProps>;
  selected: boolean;
  onPress: () => void;
  /** Divider above, inside the option list. */
  divided?: boolean;
};

/**
 * One option of a single-choice sheet (08.08 "Seçenek / Herkes"): icon, label, optional
 * description and the standard radio on the right; the selected label turns medium.
 */
export function ChoiceRow({
  label,
  description,
  icon: Icon,
  selected,
  onPress,
  divided,
}: ChoiceRowProps) {
  return (
    <Pressable
      onPress={withHaptic(onPress)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      style={({ pressed }) => [styles.row, divided && styles.divided, pressed && styles.pressed]}>
      {Icon ? <Icon width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} /> : null}
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <RadioButton selected={selected} accessibilityLabel={label} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  labelSelected: {
    fontFamily: fontFamily.medium,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
