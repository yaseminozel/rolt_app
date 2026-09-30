import { WarningCircle } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export type FormSectionProps = {
  label: string;
  /**
   * Right-aligned note in the label row: a rule ("En fazla 3") or a counter ("3/10").
   * With `hintTone="error"` it turns red and medium ("En az 1 seç", `fGq4D`).
   */
  hint?: string;
  hintTone?: 'neutral' | 'error';
  /** Red message with an alert glyph under the content ("1 fotoğraf yüklenemedi…", `fGq4D`). */
  errorText?: string;
  children: ReactNode;
  /** Outer layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

const ERROR_ICON_SIZE = 14;
/** Glyph → message gap ("Mesaj" gap 6). */
const ERROR_GAP = 6;

/**
 * Labelled block of a form for controls that are not text inputs: chip groups, segmented
 * controls, photo grids ("Alan / Rota türü", "Alan / Zorluk", "Alan / Fotoğraflar" in
 * `ldcdM` / `fGq4D`). Label row (14 medium label + 12 pt hint), 8 pt to the content, optional
 * error line. Text inputs use `TextField`, which draws the same label row, counter and error.
 */
export function FormSection({ label, hint, hintTone = 'neutral', errorText, children, style }: FormSectionProps) {
  const hintIsError = hintTone === 'error';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label} accessibilityRole="header">
          {label}
        </Text>
        {hint ? (
          <Text
            style={[styles.hint, hintIsError && styles.hintError]}
            accessibilityLiveRegion={hintIsError ? 'polite' : 'none'}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
      {errorText ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <WarningCircle
            width={ERROR_ICON_SIZE}
            height={ERROR_ICON_SIZE}
            color={colors.dangerText}
            strokeWidth={1.5}
          />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    flex: 1,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  hintError: {
    ...typography.captionMedium,
    color: colors.dangerText,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ERROR_GAP,
  },
  errorText: {
    ...typography.caption,
    flex: 1,
    color: colors.dangerText,
  },
});
