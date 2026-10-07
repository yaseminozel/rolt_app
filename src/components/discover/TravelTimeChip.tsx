import { NavArrowDown, Navigator } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

const ICON_SIZE = 14;

type TravelTimeChipProps = {
  /** e.g. "Başlangıca 1 saat içinde". */
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * Applied travel-time filter on the full route list (05.03 `r7NfD9` "Filtre / Başlangıca 1 saat"):
 * a brand-tinted 34 pt pill with the navigation glyph and a chevron that opens the time picker.
 */
export function TravelTimeChip({ label, accessibilityLabel, onPress }: TravelTimeChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Navigator width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <NavArrowDown width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 34,
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandApplied,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...typography.calloutSemibold,
    lineHeight: 16,
    color: colors.brand,
  },
});
