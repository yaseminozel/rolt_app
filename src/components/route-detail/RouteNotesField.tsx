import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/theme';

const MIN_BOX_HEIGHT = 79;

/**
 * "Field / Notlar" as a read-only field at the end of route and ride details (05.04 `1083:18661`,
 * 09.06 `1083:18645`): a 14 pt label over a bordered box holding the notes.
 */
export function RouteNotesField({ label, notes }: { label: string; notes: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label} accessibilityRole="header">
        {label}
      </Text>
      <View style={styles.box}>
        <Text style={styles.notes}>{notes}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  box: {
    minHeight: MIN_BOX_HEIGHT,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  notes: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});
