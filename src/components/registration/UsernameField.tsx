import { XmarkCircle } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField, type TextFieldProps } from '@/components/ui/TextField';
import { colors, radius, spacing, typography } from '@/theme';

/** Height of the TextField box; the error icon is centred on it. */
const FIELD_HEIGHT = 44;
/** Same size as TextField's trailing success check, so both states share one slot. */
const ERROR_ICON_SIZE = 20;
/** Column gap between field, message and suggestion row, and between chips (eIU92). */
const SUGGESTION_GAP = 6;
/** Chip padding [5, 8] from eIU92 "Öneri / …". */
const CHIP_PADDING_VERTICAL = 5;
const CHIP_PADDING_HORIZONTAL = 8;
/** Grows the ~25 pt chip to a 45 pt touch target without changing how it looks. */
const CHIP_HIT_SLOP = { top: 10, bottom: 10, left: SUGGESTION_GAP / 2, right: SUGGESTION_GAP / 2 };

type UsernameFieldProps = Omit<TextFieldProps, 'label' | 'accessibilityLabel'> & {
  label: string;
  /** Free alternatives shown as chips under a taken username. */
  suggestions?: readonly string[];
  /** Visible chip text for a suggestion, e.g. "@yasemin.rides". */
  formatSuggestion: (username: string) => string;
  onSuggestionPress: (username: string) => void;
  suggestionsAccessibilityLabel: string;
  suggestionAccessibilityHint: string;
};

/**
 * "Kullanıcı adı" field of 00.8 (UZpFX, eIU92): TextField with an "@" prefix plus the taken
 * state — a trailing error icon in the field and a row of suggestion chips; tapping a chip
 * fills the field (the caller re-checks it).
 *
 * TextField only has a trailing slot for the success check, so the error icon is overlaid
 * here like SelectField's chevron. The label is rendered here so the overlay can be anchored
 * to the field box. The 20-character username limit keeps the value clear of the icon.
 */
export function UsernameField({
  label,
  suggestions = [],
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
          <TextField {...fieldProps} errorText={errorText} accessibilityLabel={label} />
          {errorText ? (
            <View style={styles.errorIcon} accessibilityElementsHidden importantForAccessibility="no">
              <XmarkCircle
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
        <View style={styles.suggestions} accessibilityLabel={suggestionsAccessibilityLabel}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => onSuggestionPress(suggestion)}
              accessibilityRole="button"
              accessibilityHint={suggestionAccessibilityHint}
              hitSlop={CHIP_HIT_SLOP}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipLabel} numberOfLines={1}>
                {formatSuggestion(suggestion)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SUGGESTION_GAP,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SUGGESTION_GAP,
  },
  chip: {
    paddingVertical: CHIP_PADDING_VERTICAL,
    paddingHorizontal: CHIP_PADDING_HORIZONTAL,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSubtle,
  },
  pressed: {
    opacity: 0.6,
  },
  chipLabel: {
    ...typography.captionMedium,
    color: colors.brand,
  },
});
