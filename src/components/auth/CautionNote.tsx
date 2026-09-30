import { Clock } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type CautionNoteProps = {
  text: string;
};

const ICON_SIZE = 18;
/** Horizontal inset from the design ("Bilgi" padding [12, 14]); off the 4 pt scale. */
const NOTE_INSET = 14;

/**
 * Orange time note on 00.6 "Bağlantının süresi dolmuş" (Pencil `r4vCy`), e.g.
 * "Bağlantı 30 Eylül, 14:05’te gönderildi." Kept local: `InfoNote` has no caution tone.
 */
export function CautionNote({ text }: CautionNoteProps) {
  return (
    <View style={styles.note}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Clock width={ICON_SIZE} height={ICON_SIZE} color={colors.cautionIcon} strokeWidth={1.5} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: NOTE_INSET,
    borderRadius: radius.md,
    backgroundColor: colors.cautionSurface,
  },
  text: {
    ...typography.calloutMedium,
    flex: 1,
    color: colors.cautionText,
  },
});
