import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type ScreenPlaceholderProps = {
  /** Frame name of the Pencil screen this route will implement, e.g. "02.0 Record / Ready". */
  title: string;
};

/** Temporary body for routes whose screen has not been built yet. */
export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
