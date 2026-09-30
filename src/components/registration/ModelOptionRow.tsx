import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RadioButton } from '@/components/ui/RadioButton';
import { colors, fontFamily, spacing, typography } from '@/theme';

/** Row inset from g4Zy4 ("Model / …", padding [12, 14]). */
const ROW_INSET = 14;

type ModelOptionRowProps = {
  title: string;
  /** e.g. "689 cc · Naked". */
  detail: string;
  selected: boolean;
  onPress: () => void;
  /** Draws the 1 pt divider under the row (every row but the last). */
  showDivider: boolean;
};

/**
 * Model list row on 00.10 (g4Zy4 "Model / …"): name, displacement · category and a radio.
 * Uses the standard outlined `RadioButton` (single radio system) instead of the frame's
 * 22 pt brand-blue ring; the selected row keeps the design's brand tint.
 */
export function ModelOptionRow({ title, detail, selected, onPress, showDivider }: ModelOptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        { backgroundColor: selected ? colors.brandSubtle : pressed ? colors.surfaceMuted : colors.surface },
      ]}>
      <View style={styles.text}>
        <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <RadioButton variant="outlined" selected={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: ROW_INSET,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  titleSelected: {
    fontFamily: fontFamily.semibold,
  },
  detail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
