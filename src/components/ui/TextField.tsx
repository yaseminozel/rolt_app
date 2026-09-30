import { NavArrowDown } from 'iconoir-react-native';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/** Design "Type": Standard · Multi-line · Currency · Select. Currency and Select render identically. */
export type TextFieldType = 'standard' | 'multiline' | 'currency' | 'select';

export type TextFieldProps = Omit<
  TextInputProps,
  'style' | 'editable' | 'multiline' | 'placeholderTextColor' | 'value' | 'onChangeText'
> & {
  value: string;
  onChangeText: (text: string) => void;
  type?: TextFieldType;
  label?: string;
  /** Right-aligned note in the label row (design: "Optional"). */
  optionalText?: string;
  /** Grey message under the field; hidden while `errorText` is shown. */
  helperText?: string;
  /** Puts the field in its error state and replaces the helper text. */
  errorText?: string;
  disabled?: boolean;
  /** Unit shown in the suffix selector of Currency / Select (e.g. "TL", "kg"). */
  suffix?: string;
  onSuffixPress?: () => void;
  /** Outer layout only (margins, flex). */
  containerStyle?: StyleProp<ViewStyle>;
};

const FIELD_HEIGHT = 44;
const MULTILINE_FIELD_HEIGHT = 136;
const CHEVRON_SIZE = 20;

/**
 * Text field — Pencil `HbGNS` (Inputs / Core Components).
 * Types Standard, Multi-line (with character counter when `maxLength` is set),
 * Currency and Select (suffix selector) × states Default, Focus, Filled, Disabled
 * and their Error counterparts (Empty, Focus, Filled, Disabled).
 */
export function TextField({
  value,
  onChangeText,
  type = 'standard',
  label,
  optionalText,
  helperText,
  errorText,
  disabled = false,
  suffix,
  onSuffixPress,
  containerStyle,
  maxLength,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const multiline = type === 'multiline';
  const hasSuffix = (type === 'currency' || type === 'select') && !!suffix;
  const hasError = !!errorText;
  const showCounter = multiline && maxLength !== undefined;

  const borderColor = hasError ? colors.danger : focused ? colors.borderFocus : colors.border;
  const labelColor = disabled ? colors.textDisabled : colors.textPrimary;
  const noteColor = disabled ? colors.textDisabled : colors.textTertiary;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  const message = hasError ? errorText : helperText;

  const suffixContent = (
    <>
      <View style={styles.divider} />
      <Text style={[styles.suffixValue, { color: disabled ? colors.textDisabled : colors.textPrimary }]}>
        {suffix}
      </Text>
      <NavArrowDown
        width={CHEVRON_SIZE}
        height={CHEVRON_SIZE}
        color={colors.textPrimary}
        strokeWidth={1.5}
      />
    </>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label || optionalText || showCounter ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          {showCounter ? (
            <Text style={[styles.note, { color: noteColor }]}>
              {`${value.length}/${maxLength}`}
            </Text>
          ) : optionalText ? (
            <Text style={[styles.note, { color: noteColor }]}>{optionalText}</Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor, backgroundColor: disabled ? colors.surfaceMuted : colors.surface },
        ]}
      >
        <TextInput
          {...inputProps}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={disabled ? colors.textDisabled : colors.textTertiary}
          selectionColor={colors.textPrimary}
          cursorColor={colors.textPrimary}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          accessibilityHint={message}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: disabled ? colors.textDisabled : colors.textPrimary },
          ]}
        />
        {hasSuffix ? (
          onSuffixPress ? (
            <Pressable
              onPress={onSuffixPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={suffix}
              accessibilityState={{ disabled }}
              hitSlop={spacing.xs}
              style={styles.suffix}
            >
              {suffixContent}
            </Pressable>
          ) : (
            <View style={styles.suffix}>{suffixContent}</View>
          )
        ) : null}
      </View>

      {message ? (
        <Text style={[styles.message, { color: hasError ? colors.dangerText : colors.textTertiary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    flex: 1,
  },
  note: {
    ...typography.caption,
  },
  field: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  fieldMultiline: {
    height: MULTILINE_FIELD_HEIGHT,
    alignItems: 'stretch',
  },
  input: {
    ...typography.bodyLarge,
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputMultiline: {
    lineHeight: 24,
  },
  suffix: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  suffixValue: {
    ...typography.bodyMedium,
  },
  message: {
    ...typography.caption,
  },
});
