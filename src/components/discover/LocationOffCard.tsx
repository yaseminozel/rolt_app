import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, typography } from '@/theme';

const IMAGE_WIDTH = 95;
const IMAGE_HEIGHT = 86;
const BODY_LINE_HEIGHT = 20;

const illustration = require('../../../assets/images/location-off-illustration.png');

type LocationOffCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

/**
 * "Durum kartı / Konum izni yok" (05.01 `Jbnan` `kI6r4`): takes the map card's place on Home
 * while location access is off and no region was picked.
 */
export function LocationOffCard({ title, description, actionLabel, onAction }: LocationOffCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={illustration}
        style={styles.image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Button variant="outlined" label={actionLabel} onPress={onAction} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
  copy: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyLargeSemibold,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    lineHeight: BODY_LINE_HEIGHT,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Outlined button on the muted card keeps the white fill of the design.
  action: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
  },
});
