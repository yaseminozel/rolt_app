import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { BrandAvatar } from '@/components/registration/BrandAvatar';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, typography } from '@/theme';

const LOGO_WELL_SIZE = 44;

type GarageBikeRowProps = {
  brand: MotorcycleBrand;
  /** e.g. "Yamaha MT-07". */
  title: string;
  /** e.g. "2022 · 689 cc · Naked"; hidden when empty. */
  detail?: string;
  /** Tag for the main bike, e.g. "Ana motor". */
  badgeLabel?: string;
  /** Draws the bottom divider (all rows but the last). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Read-only motorcycle row for a profile's "Garaj" tab: 44 pt brand logo well (as on the
 * registration brand tiles), model and detail line, optional main-bike tag and a divider
 * following the route row rhythm.
 */
export function GarageBikeRow({
  brand,
  title,
  detail,
  badgeLabel,
  divider = false,
  style,
}: GarageBikeRowProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content} accessible>
        <BrandAvatar brand={brand} size={LOGO_WELL_SIZE} backgroundColor={colors.surfaceMuted} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {badgeLabel ? (
          <Badge label={badgeLabel} tone="neutral" size="small" showIcon={false} />
        ) : null}
      </View>
      {divider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyLargeMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
