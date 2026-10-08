import { Camera, Plus } from 'iconoir-react-native';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, fontFamily, spacing, typography } from '@/theme';

const AVATAR_SIZE = 80;
const BADGE_SIZE = 28;
/** Badge corner ("Badge / Fotoğraf ekle" at 54, 54 on the 80 pt avatar). */
const BADGE_OFFSET = 54;
const EMPTY_CAMERA_SIZE = 28;
const BADGE_ICON_SIZE = 16;
const BADGE_CAMERA_SIZE = 14;
/** Hint text: 13 pt at 1.25. */
const DESCRIPTION_LINE_HEIGHT = 16;

type ProfilePhotoPickerProps = {
  photoUri?: string;
  title: string;
  description: string;
  onPress: () => void;
  /** A bundled photo (the sample account's avatar) when there is no picked `photoUri`. */
  photoSource?: ImageSourcePropType;
};

/**
 * "Profile photo" block of 04.01 (Pencil `R9JExd` empty, `mFKFe` with a photo): 80 pt avatar
 * next to a title and hint. Empty: muted disc with a brand camera and a "+" badge; with a
 * photo: the photo and a camera badge for changing it. The whole block is one button.
 */
export function ProfilePhotoPicker({
  photoUri,
  photoSource,
  title,
  description,
  onPress,
}: ProfilePhotoPickerProps) {
  const source = photoUri ? { uri: photoUri } : photoSource;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <View style={styles.circle}>
          {source ? (
            <Image source={source} style={styles.photo} accessibilityIgnoresInvertColors />
          ) : (
            <Camera
              width={EMPTY_CAMERA_SIZE}
              height={EMPTY_CAMERA_SIZE}
              color={colors.brand}
              strokeWidth={1.5}
            />
          )}
        </View>
        <View style={styles.badge}>
          {source ? (
            <Camera
              width={BADGE_CAMERA_SIZE}
              height={BADGE_CAMERA_SIZE}
              color={colors.textInverse}
              strokeWidth={1.8}
            />
          ) : (
            <Plus
              width={BADGE_ICON_SIZE}
              height={BADGE_ICON_SIZE}
              color={colors.textInverse}
              strokeWidth={2}
            />
          )}
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
    borderWidth: 1,
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
    ...typography.bodyLargeSemibold,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: DESCRIPTION_LINE_HEIGHT,
    color: colors.textSecondary,
  },
});
