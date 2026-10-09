import { Check } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { withHaptic } from '@/features/haptics/haptics';
import { colors, radius, spacing, typography } from '@/theme';

export type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress?: () => void;
  /** Leading Iconoir icon shown while unselected (e.g. `HalfMoon` for "Gece sürüşü"). */
  icon?: ComponentType<SvgProps>;
  /** Replace the leading icon with a check when selected. Default true; off for year pills. */
  showCheck?: boolean;
  /** `checkbox` for multi-select sets (default), `radio` inside a single-select `radiogroup`. */
  role?: 'checkbox' | 'radio';
  accessibilityLabel?: string;
  /** Outer layout only (e.g. `{ flex: 1 }` for equal-width year pills). */
  style?: StyleProp<ViewStyle>;
};

const CHIP_HEIGHT = 36;
const ICON_SIZE = 16;
/** Icon-to-label gap (Fv4ol chips). */
const CONTENT_GAP = 6;

/**
 * Pill-shaped selectable chip — "Sevdiğin yollar" (Fv4ol, multi-select with check) and
 * "Model yılı" (g4Zy4, single-select pills). Selected: dark fill, white label (+ check);
 * unselected: white, 1 pt border, gray icon and label.
 * Distinct from FilterChip (radius 10, filter glyph, filter semantics).
 */
export function SelectableChip({
  label,
  selected,
  onPress,
  icon: Icon,
  showCheck = true,
  role = 'checkbox',
  accessibilityLabel,
  style,
}: SelectableChipProps) {
  const LeadingIcon = selected ? (showCheck ? Check : undefined) : Icon;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected }}
      onPress={withHaptic(onPress)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? {
              backgroundColor: pressed ? colors.surfaceInverseActive : colors.surfaceInverse,
              borderColor: colors.surfaceInverse,
            }
          : {
              backgroundColor: pressed ? colors.surfacePressed : colors.surface,
              borderColor: colors.border,
            },
        style,
      ]}
    >
      {LeadingIcon ? (
        <LeadingIcon
          width={ICON_SIZE}
          height={ICON_SIZE}
          color={selected ? colors.textInverse : colors.textSecondary}
          strokeWidth={1.5}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.label, { color: selected ? colors.textInverse : colors.textBody }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CONTENT_GAP,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.calloutMedium,
  },
});
