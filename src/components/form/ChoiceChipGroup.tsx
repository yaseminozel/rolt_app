import type { ComponentType } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { SelectableChip } from '@/components/ui/SelectableChip';
import { spacing } from '@/theme';

import { FormSection } from './FormSection';

export type ChoiceChipOption<T extends string> = {
  value: T;
  label: string;
  /** Leading Iconoir icon shown while unselected. */
  icon?: ComponentType<SvgProps>;
};

export type ChoiceChipGroupProps<T extends string> = {
  label: string;
  options: readonly ChoiceChipOption<T>[];
  /** Selected values, in the order they were picked. */
  value: readonly T[];
  onChange: (value: T[]) => void;
  /** `multiple` (default): checkbox chips; `single`: radio chips, picking one replaces the other. */
  selection?: 'multiple' | 'single';
  /** Multiple selection cap; unselected chips ignore taps while the cap is reached. */
  max?: number;
  /** Rule shown right of the label, e.g. "En fazla 3". */
  hint?: string;
  /** Replaces the hint in red, e.g. "En az 1 seç" (`fGq4D`). */
  errorText?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Labelled, wrapping group of `SelectableChip`s ("Rota türü" in `ldcdM`): multi-select with an
 * optional cap, or single-select where tapping the selected chip clears it. The hint slot in
 * the label row carries the rule and, in the error state, the validation message.
 */
export function ChoiceChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  selection = 'multiple',
  max,
  hint,
  errorText,
  style,
}: ChoiceChipGroupProps<T>) {
  const single = selection === 'single';
  const atMax = !single && max !== undefined && value.length >= max;

  const toggle = (option: T) => {
    const selected = value.includes(option);
    if (single) {
      onChange(selected ? [] : [option]);
      return;
    }
    if (selected) {
      onChange(value.filter((item) => item !== option));
    } else if (!atMax) {
      onChange([...value, option]);
    }
  };

  return (
    <FormSection
      label={label}
      hint={errorText ?? hint}
      hintTone={errorText ? 'error' : 'neutral'}
      style={style}>
      <View
        accessibilityRole={single ? 'radiogroup' : undefined}
        accessibilityLabel={label}
        style={styles.chips}>
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <SelectableChip
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={selected}
              role={single ? 'radio' : 'checkbox'}
              // At the cap, unselected chips announce the rule so the ignored tap is explained.
              accessibilityLabel={!selected && atMax && hint ? `${option.label}, ${hint}` : undefined}
              onPress={() => toggle(option.value)}
            />
          );
        })}
      </View>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
