import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

type HeaderSkipButtonProps = {
  onPress: () => void;
};

/** "Atla" text action in the registration header (QKDo5 `H2TB8Y`, Fv4ol `MPcVr`). */
export function HeaderSkipButton({ onPress }: HeaderSkipButtonProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.label}>{t('actions.skip')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodySemibold,
    color: colors.textSecondary,
  },
});
