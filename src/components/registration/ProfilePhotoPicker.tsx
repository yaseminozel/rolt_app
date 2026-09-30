import { Camera, Plus } from 'iconoir-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, spacing, typography } from '@/theme';

const AVATAR_SIZE = 80;
const BADGE_SIZE = 26;
/** Badge sits flush with the avatar's bottom-right corner (UZpFX `X6yUw` at 54, 54). */
const BADGE_OFFSET = AVATAR_SIZE - BADGE_SIZE;

type ProfilePhotoPickerProps = {
  photoUri?: string;
  title: string;
  description: string;
  onPress: () => void;
};

/**
 * "Profil fotoğrafı" block on 00.8 (UZpFX `N3y93`): 80 pt avatar with a camera glyph (or the
 * picked photo) and a brand "+" badge, next to a title and hint. The whole block is one button.
 */
export function ProfilePhotoPicker({ photoUri, title, description, onPress }: ProfilePhotoPickerProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <View style={styles.circle}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} accessibilityIgnoresInvertColors />
          ) : (
            <Camera width={26} height={26} color={colors.textSecondary} strokeWidth={1.5} />
          )}
        </View>
        <View style={styles.badge}>
          <Plus width={14} height={14} color={colors.textInverse} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  circle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  badge: {
    position: 'absolute',
    top: BADGE_OFFSET,
    left: BADGE_OFFSET,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  description: {
    ...typography.captionRelaxed,
    color: colors.textSecondary,
  },
});
