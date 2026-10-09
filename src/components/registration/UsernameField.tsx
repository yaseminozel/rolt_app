import { WarningTriangle } from 'iconoir-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TextField, type TextFieldProps } from '@/components/ui/TextField';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

/** Height of the TextField box; the error icon is centred on it. */
const FIELD_HEIGHT = 44;
/** Same size as TextField's trailing success check, so both states share one slot. */
const ERROR_ICON_SIZE = 20;
/** Field → suggestions (04.01 `Citg6` "Fields" gap 20). */
const SUGGESTIONS_TOP = spacing.xl;
/** Chip row: 32 pt chips, 8 pt apart, 12 pt side padding ("Suggestion / …"). */
const CHIP_HEIGHT = 32;
/** Grows the 32 pt chip to a 44 pt touch target without changing how it looks. */
const CHIP_HIT_SLOP = { top: 6, bottom: 6 };

type UsernameFieldProps = Omit<TextFieldProps, 'label' | 'accessibilityLabel'> & {
  label: string;
  /** Free alternatives shown as chips under a taken username. */
  suggestions?: readonly string[];
  /** Line above the chips ("Bunlardan birini seçebilirsin:"). */
  suggestionsTitle: string;
  /** Visible chip text for a suggestion, e.g. "@yasemin.rides". */
  formatSuggestion: (username: string) => string;
  onSuggestionPress: (username: string) => void;
  suggestionsAccessibilityLabel: string;
  suggestionAccessibilityHint: string;
};

/**
 * "Kullanıcı adı" field of 04.01 (`jmuyH` available, `Citg6` taken): TextField with an "@"
 * prefix plus the taken state — a trailing warning icon in the field and a scrollable row of
 * suggestion chips under "Bunlardan birini seçebilirsin:"; tapping a chip fills the field
 * (the caller re-checks it).
 *
 * TextField only has a trailing slot for the success check, so the error icon is overlaid
 * here like SelectField's chevron. The label is rendered here so the overlay can be anchored
 * to the field box. The 20-character username limit keeps the value clear of the icon.
 */
export function UsernameField({
  label,
  suggestions = [],
  suggestionsTitle,
  formatSuggestion,
  onSuggestionPress,
  suggestionsAccessibilityLabel,
  suggestionAccessibilityHint,
  errorText,
  containerStyle,
  ...fieldProps
}: UsernameFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>{label}</Text>
        <View>
          <TextField
            {...fieldProps}
            errorText={errorText}
            errorHaptic={false}
            accessibilityLabel={label}
          />
          {errorText ? (
            <View style={styles.errorIcon} accessibilityElementsHidden importantForAccessibility="no">
              <WarningTriangle
                width={ERROR_ICON_SIZE}
                height={ERROR_ICON_SIZE}
                color={colors.dangerText}
                strokeWidth={1.5}
              />
            </View>
          ) : null}
        </View>
      </View>
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>{suggestionsTitle}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            accessibilityLabel={suggestionsAccessibilityLabel}
            contentContainerStyle={styles.chips}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => onSuggestionPress(suggestion)}
                accessibilityRole="button"
                accessibilityHint={suggestionAccessibilityHint}
                hitSlop={CHIP_HIT_SLOP}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                <Text style={styles.chipLabel} numberOfLines={1}>
                  {formatSuggestion(suggestion)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SUGGESTIONS_TOP,
  },
  // Mirrors TextField's own label → field spacing.
  fieldBlock: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  errorIcon: {
    position: 'absolute',
    top: 0,
    right: spacing.md,
    height: FIELD_HEIGHT,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  suggestions: {
    gap: spacing.sm,
  },
  suggestionsTitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    height: CHIP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: {
    backgroundColor: colors.surfacePressed,
  },
  chipLabel: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
});
