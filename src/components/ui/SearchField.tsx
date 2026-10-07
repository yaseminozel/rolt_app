import { Search, Xmark } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/** `outlined` = white field with 1 pt border (g4Zy4 "Yamaha modeli ara"); `filled` = muted fill (QKDo5 "Marka ara"). */
export type SearchFieldVariant = 'outlined' | 'filled';

export type SearchFieldProps = Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText' | 'placeholderTextColor' | 'multiline' | 'editable'
> & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  variant?: SearchFieldVariant;
  disabled?: boolean;
  /**
   * Shows a trailing clear button while there is text (04.02 "Konumun" search, `R90P27`).
   * Most searches in the design have none, so it is opt-in.
   */
  onClear?: () => void;
  /** Outer layout only (margins, flex). */
  containerStyle?: StyleProp<ViewStyle>;
};

const FIELD_HEIGHT = 44;
const ICON_SIZE = 20;

/**
 * Search field with a leading magnifier — "Marka ara" (QKDo5) and "Yamaha modeli ara"
 * (g4Zy4), aligned to the board Input metrics used by every other search in the app
 * (44 pt, radius 12, 12 pt padding, 8 pt gap, 16 pt text). No clear button (none in design).
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  variant = 'outlined',
  disabled = false,
  onClear,
  containerStyle,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...inputProps
}: SearchFieldProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  const filled = variant === 'filled';
  const borderColor = focused ? colors.borderFocus : filled ? colors.transparent : colors.border;
  const backgroundColor = disabled || filled ? colors.surfaceMuted : colors.surface;

  return (
    <View style={[styles.field, { borderColor, backgroundColor }, containerStyle]}>
      <Search
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={disabled ? colors.textDisabled : colors.textSecondary}
        strokeWidth={1.5}
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        editable={!disabled}
        placeholderTextColor={disabled ? colors.textDisabled : colors.textTertiary}
        selectionColor={colors.textPrimary}
        cursorColor={colors.textPrimary}
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityState={{ disabled }}
        style={[styles.input, { color: disabled ? colors.textDisabled : colors.textPrimary }]}
      />
      {onClear && value.length > 0 && !disabled ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={t('actions.clear')}
          hitSlop={spacing.md}
          style={styles.clear}>
          <Xmark width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clear: {
    paddingRight: spacing.md,
  },
  field: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  input: {
    ...typography.bodyLarge,
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
});
