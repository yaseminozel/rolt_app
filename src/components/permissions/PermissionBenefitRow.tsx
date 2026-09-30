import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/theme';

const ICON_WELL_SIZE = 36;
const ICON_SIZE = 18;

type PermissionBenefitRowProps = {
  icon: ComponentType<SvgProps>;
  title: string;
  text: string;
};

/**
 * "Fayda / …" row on the permission screens (TJtI6, RzQd4): 36 pt muted icon well with an
 * 18 pt glyph, 14 pt semibold title and 12 pt secondary text. Read as one element.
 */
export function PermissionBenefitRow({ icon: Icon, title, text }: PermissionBenefitRowProps) {
  return (
    <View style={styles.row} accessible>
      <View style={styles.iconWell}>
        <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWell: {
    width: ICON_WELL_SIZE,
    height: ICON_WELL_SIZE,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  text: {
    ...typography.captionRelaxed,
    color: colors.textSecondary,
  },
});
