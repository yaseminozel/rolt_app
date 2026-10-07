import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

const IMAGE_WIDTH = 59;
const IMAGE_HEIGHT = 48;
/** Title 14 pt medium and text 14 pt at 1.2 ("Benefit / …" in `HOw3b`). */
const LINE_HEIGHT = 17;

type LocationBenefitCardProps = {
  image: ImageSourcePropType;
  title: string;
  text: string;
};

/**
 * Benefit card on 04.02 "Konum — İzin verilmemiş" (Pencil `HpEoA`): photo thumbnail next to a
 * title and one line on what location access unlocks.
 */
export function LocationBenefitCard({ image, title, text }: LocationBenefitCardProps) {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.image} accessibilityIgnoresInvertColors />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: radius.chip,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyMedium,
    lineHeight: LINE_HEIGHT,
    color: colors.textPrimary,
  },
  text: {
    ...typography.body,
    lineHeight: LINE_HEIGHT,
    color: colors.textSecondary,
  },
});
