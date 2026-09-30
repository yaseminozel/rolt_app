import { Search, XmarkCircle } from 'iconoir-react-native';
import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

type DiscoverSearchFieldProps = Pick<TextInputProps, 'onFocus' | 'onBlur' | 'onSubmitEditing'> & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Clear (×) action, shown while there is text (aZnjb `MTT2f`, T2ku5 `EESVw`). */
  onClear: () => void;
  ref?: Ref<TextInput>;
};

const FIELD_HEIGHT = 44;
const ICON_SIZE = 20;

/**
 * Discover search field: the shared `SearchField` metrics (44 pt, radius 12, 1 pt border,
 * dark focus border, 20 pt icon, 16 pt text) plus the trailing clear button the Discover
 * search states draw. Kept local because `SearchField` has no trailing action slot.
 */
export function DiscoverSearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  onFocus,
  onBlur,
  onSubmitEditing,
  ref,
}: DiscoverSearchFieldProps) {
  const { t } = useTranslation('discover');
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, { borderColor: focused ? colors.borderFocus : colors.border }]}>
      <Search width={ICON_SIZE} height={ICON_SIZE} color={colors.textSecondary} strokeWidth={1.5} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.textPrimary}
        cursorColor={colors.textPrimary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        submitBehavior="blurAndSubmit"
        clearButtonMode="never"
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
          <XmarkCircle width={ICON_SIZE} height={ICON_SIZE} color={colors.textTertiary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  input: {
    ...typography.bodyLarge,
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    color: colors.textPrimary,
  },
  // 44 pt target; the glyph lands 12 pt from the trailing edge like the design.
  clear: {
    width: layout.minTouchTarget,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
});
