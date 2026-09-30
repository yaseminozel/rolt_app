import { CheckCircle, Eye, EyeClosed, NavArrowDown } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  /** Puts the field in its error state and replaces the helper and success text. */
  errorText?: string;
  /**
   * Positive validation (UZpFX "Bu kullanıcı adı müsait"): green message plus a trailing
   * check-circle. Replaces the helper text; `errorText` wins over it.
   */
  successText?: string;
  /** Fixed text inside the field before the value, e.g. "@" for the username (UZpFX). */
  prefix?: string;
  /**
   * Password field with a show/hide eye button (U4fki9). Masks the value, disables
   * auto-capitalization and auto-correct; pass `textContentType` / `autoComplete`
   * (e.g. "password" / "newPassword", "current-password" / "new-password").
   */
  secureToggle?: boolean;
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
const TRAILING_ICON_SIZE = 20;

/**
 * Text field — Pencil `HbGNS` (Inputs / Core Components).
 * Types Standard, Multi-line (with character counter when `maxLength` is set),
 * Currency and Select (suffix selector) × states Default, Focus, Filled, Disabled
 * and their Error counterparts (Empty, Focus, Filled, Disabled).
 * Auth/registration extensions: password eye toggle (`U4fki9`), "@" prefix and
 * success state (`UZpFX`).
 */
export function TextField({
  value,
  onChangeText,
  type = 'standard',
  label,
  optionalText,
  helperText,
  errorText,
  successText,
  prefix,
  secureToggle = false,
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
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const multiline = type === 'multiline';
  const hasError = !!errorText;
  const hasSuccess = !hasError && !!successText;
  // One trailing slot: secure toggle > success check > suffix selector.
  const showSecureToggle = secureToggle && !multiline;
  const showSuccessIcon = !showSecureToggle && hasSuccess;
  const hasSuffix =
    !showSecureToggle && !showSuccessIcon && (type === 'currency' || type === 'select') && !!suffix;
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

  const message = hasError ? errorText : hasSuccess ? successText : helperText;
  const messageColor = hasError ? colors.dangerText : hasSuccess ? colors.success : colors.textTertiary;
  const RevealIcon = revealed ? EyeClosed : Eye;

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
        {prefix && !multiline ? (
          <Text
            style={[styles.prefix, { color: disabled ? colors.textDisabled : colors.textTertiary }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...inputProps}
          {...(showSecureToggle
            ? { secureTextEntry: !revealed, autoCapitalize: 'none' as const, autoCorrect: false }
            : {})}
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
            prefix && !multiline ? styles.inputAfterPrefix : null,
            showSecureToggle || showSuccessIcon ? styles.inputBeforeTrailing : null,
            { color: disabled ? colors.textDisabled : colors.textPrimary },
          ]}
        />
        {showSecureToggle ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('a11y.hidePassword') : t('a11y.showPassword')}
            accessibilityState={{ disabled }}
            style={styles.trailingButton}
          >
            <RevealIcon
              width={TRAILING_ICON_SIZE}
              height={TRAILING_ICON_SIZE}
              color={disabled ? colors.textDisabled : colors.textPrimary}
              strokeWidth={1.5}
            />
          </Pressable>
        ) : null}
        {showSuccessIcon ? (
          <View style={styles.trailingIcon} accessibilityElementsHidden importantForAccessibility="no">
            <CheckCircle
              width={TRAILING_ICON_SIZE}
              height={TRAILING_ICON_SIZE}
              color={colors.success}
              strokeWidth={1.5}
            />
          </View>
        ) : null}
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
        <Text style={[styles.message, { color: messageColor }]}>
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
  prefix: {
    ...typography.bodyLarge,
    paddingLeft: spacing.md,
  },
  // The prefix sits 8 pt before the value (UZpFX gap).
  inputAfterPrefix: {
    paddingLeft: spacing.sm,
  },
  inputBeforeTrailing: {
    paddingRight: 0,
  },
  // 44 pt touch target; the 20 pt glyph lands 12 pt from the field edge like the board's trailing slot.
  trailingButton: {
    width: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingIcon: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
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
