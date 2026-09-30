import { Sparks } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type RiderMatchNoteProps = {
  /** Full sentence, e.g. "%92 uyum · 3 ortak rota · İkiniz de virajlı yolları seviyorsunuz". */
  text: string;
};

const ICON_SIZE = 14;
/** Design padding [8, 10] ("Ortak noktalar"). */
const HORIZONTAL_PADDING = 10;

/**
 * Compact teal note on another rider's profile ("Ortak noktalar", gKG8D `RmILP`).
 * Lighter than `InfoNote accent` (no icon disc, 12 pt text), so it is its own component.
 */
export function RiderMatchNote({ text }: RiderMatchNoteProps) {
  return (
    <View style={styles.container}>
      <Sparks
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={colors.noteAccentText}
        strokeWidth={1.5}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: HORIZONTAL_PADDING,
    borderRadius: radius.chip,
    backgroundColor: colors.noteAccentSurface,
  },
  text: {
    ...typography.captionMedium,
    lineHeight: 16,
    flex: 1,
    color: colors.noteAccentText,
  },
});
