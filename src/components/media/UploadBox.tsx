import { MediaImagePlus } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type UploadBoxProps = {
  title: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  /** Dashed outline with a brand glyph (08.05 ride photos). */
  dashed?: boolean;
};

/**
 * Empty image field (08.05 "Görsel yükle", 10.13 "Ekran görüntüsü ekle"): a bordered box with
 * the add-image glyph, a title and a hint. Picked images replace it with tiles.
 */
export function UploadBox({ title, hint, onPress, disabled, dashed = false }: UploadBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.box, dashed && styles.dashed, pressed && styles.pressed]}>
      <MediaImagePlus
        width={20}
        height={20}
        color={dashed ? colors.brand : colors.textPrimary}
        strokeWidth={1.5}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  // Ride photos (08.05 "Görsel yükle"): dashed outline and a brand glyph.
  dashed: {
    minHeight: 92,
    borderStyle: 'dashed',
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  text: {
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textTertiary,
  },
});
