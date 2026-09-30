import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

import { BrandAvatar } from './BrandAvatar';

const LOGO_WELL_SIZE = 40;
/** "Seçili marka" padding [10, 12] (g4Zy4 `miwal`). */
const VERTICAL_INSET = 10;

type SelectedBrandSummaryProps = {
  brand?: MotorcycleBrand;
  brandName: string;
  /** Small label above the name ("Marka"). */
  label: string;
  changeLabel: string;
  onChange: () => void;
};

/** Selected brand recap with a "Değiştir" link at the top of 00.10 (g4Zy4 `miwal`). */
export function SelectedBrandSummary({ brand, brandName, label, changeLabel, onChange }: SelectedBrandSummaryProps) {
  return (
    <View style={styles.container}>
      <BrandAvatar brand={brand} customName={brandName} size={LOGO_WELL_SIZE} backgroundColor={colors.surface} />
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {brandName}
        </Text>
      </View>
      <Pressable
        onPress={onChange}
        accessibilityRole="button"
        accessibilityLabel={`${changeLabel}, ${brandName}`}
        hitSlop={spacing.md}
        style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.change}>{changeLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: VERTICAL_INSET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  change: {
    ...typography.calloutSemibold,
    color: colors.brand,
  },
  pressed: {
    opacity: 0.6,
  },
});
