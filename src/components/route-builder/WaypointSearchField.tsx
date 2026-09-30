import { XmarkCircle } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import type { WaypointKind } from '@/features/route-suggestion/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

import { WaypointBadge } from './WaypointBadge';

export type WaypointSearchFieldProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholderTextColor'> & {
  kind: WaypointKind;
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
};

const FIELD_HEIGHT = 44;
const CLEAR_SIZE = 18;

/**
 * Search field of 04.1 "Başlangıç ara" (`HBC2V`): the waypoint's A / B / stop badge leads instead
 * of a magnifier, and a clear button trails once there is text. Metrics follow the app's
 * `SearchField` / TextField standard (44 pt, radius 12, 1 pt outline, dark when focused, 16 pt
 * text) rather than the screen's 48 pt / 1.5 pt drawing; `SearchField` itself has no lead or
 * clear slot.
 */
export function WaypointSearchField({ kind, value, onChangeText, style, onFocus, onBlur, ...inputProps }: WaypointSearchFieldProps) {
  const { t } = useTranslation('routeSuggestion');
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, { borderColor: focused ? colors.borderFocus : colors.border }, style]}>
      <WaypointBadge kind={kind} size="field" />
      <TextInput
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        {...inputProps}
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
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.brand}
        cursorColor={colors.brand}
        accessibilityRole="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          hitSlop={(layout.minTouchTarget - CLEAR_SIZE) / 2}
          style={styles.clear}>
          <XmarkCircle width={CLEAR_SIZE} height={CLEAR_SIZE} color={colors.textTertiary} strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.bodyLarge,
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    color: colors.textPrimary,
  },
  clear: {
    paddingRight: spacing.md,
  },
});
