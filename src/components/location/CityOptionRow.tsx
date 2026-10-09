import { Check } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { withHaptic } from '@/features/haptics/haptics';
import { colors, fontFamily, layout, spacing } from '@/theme';

const CHECK_SIZE = 20;
/** "Onay" glyph stroke: 1.8 pt at 20 pt, in the 24-unit viewBox (same as SettingsRow). */
const CHECK_STROKE = (1.8 * 24) / CHECK_SIZE;

type CityOptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Single-choice row of the city picker sheet, following the option sheets ("Dil", vfpFt):
 * 15 pt label (medium when selected), 16 pt vertical padding, 1 pt divider, and the
 * SettingsRow "Onay" check for the current value. SettingsRow itself needs a leading icon.
 */
export function CityOptionRow({ label, selected, onPress }: CityOptionRowProps) {
  return (
    <Pressable
      onPress={withHaptic(onPress)}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {selected ? (
        <Check width={CHECK_SIZE} height={CHECK_SIZE} color={colors.textPrimary} strokeWidth={CHECK_STROKE} />
      ) : (
        <View style={styles.placeholder} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touchTarget,
    paddingVertical: spacing.lg,
    marginHorizontal: layout.screenGutter,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  labelSelected: {
    fontFamily: fontFamily.medium,
  },
  placeholder: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
  },
});
