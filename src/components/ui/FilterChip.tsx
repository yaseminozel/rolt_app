import { Filter, NavArrowDown, NavArrowUp, Xmark } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { withHaptic } from '@/features/haptics/haptics';
import { colors, radius, spacing, typography } from '@/theme';

export type FilterChipDropdownState = 'default' | 'open' | 'applied' | 'disabled' | 'removable';

type FilterChipBaseProps = {
  /** Visible text; dropdown labels end with a colon in the design, e.g. "Label:". */
  label: string;
  /** Show the filter icon (leading on dropdowns, trailing on toggles). */
  showIcon?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

type FilterChipDropdownProps = FilterChipBaseProps & {
  type: 'dropdown';
  state?: FilterChipDropdownState;
  /** Applied filter count, rendered only in the `applied` state. */
  count?: number;
};

type FilterChipToggleProps = FilterChipBaseProps & {
  type: 'toggle';
  selected: boolean;
};

export type FilterChipProps = FilterChipDropdownProps | FilterChipToggleProps;

const DROPDOWN_ICON_SIZE = 20;
const TOGGLE_ICON_SIZE = 16;
const DROPDOWN_HEIGHT = 36;
const TOGGLE_HEIGHT = 32;

/**
 * Filter Chip (Pencil `iCyEV`).
 * - `dropdown`: opens a filter picker; states Default / Open / Applied (with count) / Disabled / Removable.
 * - `toggle`: simple independent on/off filter; states Default / Selected.
 */
export function FilterChip(props: FilterChipProps) {
  return props.type === 'dropdown' ? <DropdownChip {...props} /> : <ToggleChip {...props} />;
}

function DropdownChip({
  label,
  showIcon = true,
  onPress,
  accessibilityLabel,
  state = 'default',
  count,
}: FilterChipDropdownProps) {
  const disabled = state === 'disabled';
  const TrailingIcon = state === 'open' ? NavArrowUp : state === 'removable' ? Xmark : NavArrowDown;
  const iconProps = { width: DROPDOWN_ICON_SIZE, height: DROPDOWN_ICON_SIZE, color: colors.textSecondary };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, expanded: state === 'open' }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[
        styles.chip,
        styles.dropdown,
        state === 'default' && styles.chipDefault,
        (state === 'open' || state === 'applied' || state === 'removable') && styles.chipActive,
        disabled && styles.chipDisabled,
      ]}
    >
      {showIcon ? <Filter {...iconProps} /> : null}
      <Text numberOfLines={1} style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
      {state === 'applied' && count !== undefined ? (
        <View style={styles.countBadge}>
          <Text style={styles.count}>{count}</Text>
        </View>
      ) : null}
      <TrailingIcon {...iconProps} />
    </Pressable>
  );
}

function ToggleChip({
  label,
  showIcon = true,
  onPress,
  accessibilityLabel,
  selected,
}: FilterChipToggleProps) {
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected }}
      onPress={withHaptic(onPress)}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[styles.chip, styles.toggle, selected ? styles.chipSelected : styles.chipDefault]}
    >
      <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
      {showIcon ? (
        <Filter
          width={TOGGLE_ICON_SIZE}
          height={TOGGLE_ICON_SIZE}
          color={selected ? colors.textInverse : colors.textSecondary}
          style={styles.toggleIcon}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  dropdown: {
    height: DROPDOWN_HEIGHT,
  },
  toggle: {
    height: TOGGLE_HEIGHT,
  },
  chipDefault: {
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.borderFocus,
  },
  chipSelected: {
    borderColor: colors.surfaceInverse,
    backgroundColor: colors.surfaceInverse,
  },
  chipDisabled: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDisabled,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
  countBadge: {
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceInverse,
  },
  count: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textInverse,
  },
  toggleIcon: {
    // The design mirrors the filter glyph horizontally in toggle chips.
    transform: [{ scaleX: -1 }],
  },
});
