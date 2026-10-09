import { NavArrowRight } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { withHaptic } from '@/features/haptics/haptics';
import { colors, fontFamily, layout, spacing } from '@/theme';

const ROW_HEIGHT = 52;
const CHEVRON_SIZE = 20;

type OptionRowProps = {
  label: string;
  /** Muted trailing detail, e.g. "249 cc". */
  value?: string;
  onPress: () => void;
};

/** Model / year row of the bike option sheets (04.05 "Satır / Pulsar N250", 04.06 "Satır / 2025"). */
export function OptionRow({ label, value, onPress }: OptionRowProps) {
  return (
    <Pressable
      onPress={withHaptic(onPress)}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <NavArrowRight width={CHEVRON_SIZE} height={CHEVRON_SIZE} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  value: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
