import { StyleSheet, Text, View } from 'react-native';

import { MotorcycleBrandLogo, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { colors, fontFamily } from '@/theme';

const LOGO_SIZE = 28;

type BrandAvatarProps = {
  /** Catalog brand; when absent the first letter of `customName` is shown instead of a logo. */
  brand?: MotorcycleBrand;
  customName?: string;
  /** Circle diameter: 44 (brand tile), 40 (model summary), 56 (garage card). */
  size: number;
  /** Circle fill; white on tinted rows, muted on white tiles. */
  backgroundColor: string;
};

/** Round logo well ("Logo alanı") holding a 28 pt brand mark (QKDo5, g4Zy4, LreVd). */
export function BrandAvatar({ brand, customName, size, backgroundColor }: BrandAvatarProps) {
  const initial = customName?.trim().charAt(0).toLocaleUpperCase('tr') ?? '';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      {brand ? (
        <MotorcycleBrandLogo brand={brand} size={LOGO_SIZE} />
      ) : (
        <Text style={styles.initial} accessibilityElementsHidden importantForAccessibility="no">
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Custom brands have no mark: the initial fills the 28 pt logo box.
  initial: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.textPrimary,
  },
});
