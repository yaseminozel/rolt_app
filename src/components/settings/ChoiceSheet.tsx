import type { ComponentType, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { ChoiceRow } from '@/components/ride-form/ChoiceRow';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: ComponentType<SvgProps>;
};

type ChoiceSheetProps<T extends string> = {
  title: string;
  subtitle?: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Note under the options (10.04 "Bu ayar yeni sürüşler için geçerli…"). */
  note?: ReactNode;
  saveLabel: string;
  onSave: () => void;
  saving?: boolean;
};

/**
 * Single-choice settings sheet (10.04 Sürüş görünürlüğü, 10.10 Dil, 10.11 Ölçü birimleri):
 * header, radio rows, an optional note and "Kaydet". The choice applies only on save.
 */
export function ChoiceSheet<T extends string>({
  title,
  subtitle,
  options,
  value,
  onChange,
  note,
  saveLabel,
  onSave,
  saving,
}: ChoiceSheetProps<T>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sm }]}
      bounces={false}>
      <SheetHeader title={title} subtitle={subtitle} />
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option, index) => (
          <ChoiceRow
            key={option.value}
            icon={option.icon}
            label={option.label}
            description={option.description}
            selected={value === option.value}
            divided={index > 0}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      {note ? <View style={styles.note}>{note}</View> : null}
      <Button label={saveLabel} onPress={onSave} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  content: {
    paddingTop: spacing.xl,
  },
  options: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xs,
  },
  note: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
  },
  save: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
});
