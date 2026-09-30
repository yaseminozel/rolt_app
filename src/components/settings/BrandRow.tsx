import { NavArrowRight } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { MotorcycleBrandLogo, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { colors, fontFamily, spacing } from '@/theme';

const LOGO_SIZE = 28;
const ROW_HEIGHT = 56;

type BrandRowProps = {
  brand: MotorcycleBrand;
  /** Brand name shown as the row label, e.g. "Honda". */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Motorcycle brand picker row: 28 pt logo, label and chevron.
 * Pencil node `B2BQNG` ("Satır / Marka").
 */
export function BrandRow({ brand, label, onPress, disabled, style }: BrandRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.container, style]}>
      <MotorcycleBrandLogo brand={brand} size={LOGO_SIZE} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <NavArrowRight width={20} height={20} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
