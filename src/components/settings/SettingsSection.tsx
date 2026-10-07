import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * A settings group (10.x "Bölüm"): an uppercase title over a bordered card of rows with
 * dividers between them. `inset` starts the dividers under the labels of icon rows.
 */
export function SettingsSection({
  title,
  children,
  inset = false,
}: {
  title?: string;
  children: ReactNode[];
  inset?: boolean;
}) {
  const rows = children.filter(Boolean);
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={[styles.divider, inset && styles.dividerInset]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  // 16 inset + 20 icon + 12 gap.
  dividerInset: {
    marginLeft: 48,
  },
});
