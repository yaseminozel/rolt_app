import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type OrDividerProps = {
  /** Centered word, e.g. "veya". */
  label: string;
};

/** "Email separator" between social and email sign-in (Pencil `j2WfP5`): hairlines + centered label. */
export function OrDivider({ label }: OrDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
