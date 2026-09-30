import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, fontFamily, radius, spacing } from '@/theme';

export type RouteFact = {
  key: string;
  icon: ComponentType<SvgProps>;
  label: string;
  value: string;
};

const ROW_HEIGHT = 52;
const ICON_SIZE = 22;

/**
 * "Sürüş detayları" card (01.6 `nR5w1`): icon, label and value rows with inset dividers.
 * Read-only facts, so the design's chevrons are left out (they lead nowhere).
 */
export function RouteFactsCard({ facts }: { facts: RouteFact[] }) {
  return (
    <View style={styles.card}>
      {facts.map(({ key, icon: Icon, label, value }, index) => (
        <View key={key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
            <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} />
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  value: {
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginLeft: spacing.lg + ICON_SIZE + spacing.md - 2,
    marginRight: spacing.lg,
    backgroundColor: colors.border,
  },
});
