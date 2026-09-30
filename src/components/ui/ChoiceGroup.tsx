import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RadioButton } from '@/components/ui/RadioButton';
import { colors, layout, radius, spacing, typography } from '@/theme';

const RADIO_CONTROL_SIZE = 24;

export type ChoiceGroupOption<T extends string | number> = {
  value: T;
  label: string;
};

type Option<T extends string | number> = ChoiceGroupOption<T>;

export type ChoiceGroupProps<T extends string | number> = {
  /** The design defines exactly two options. */
  options: readonly [Option<T>, Option<T>];
  /** Value of the selected option; one option is always selected. */
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Choice Group / Two (Pencil `n0gSMq`): single choice between two option cards.
 * Card surface, border and radio state express the selection together; the whole card is the touch target.
 */
export function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: ChoiceGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}
          >
            {/* Decorative: the card owns touch handling and accessibility. */}
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.radio}
            >
              <RadioButton selected={selected} />
            </View>
            <Text numberOfLines={1} style={styles.label}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.borderSelected,
  },
  radio: {
    pointerEvents: 'none',
    // RadioButton centers its 24 pt control in a 48 pt touch target; pull it back so the
    // control sits on the card's 8 pt inset like the design.
    marginHorizontal: -(layout.touchTarget - RADIO_CONTROL_SIZE) / 2,
  },
  label: {
    ...typography.bodyMedium,
    flex: 1,
    color: colors.textPrimary,
  },
});
