import { Image } from 'expo-image';
import { User } from 'iconoir-react-native';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { colors, shadows } from '@/theme';

type ProfileAvatarProps = {
  source?: ImageSourcePropType;
  /** 52 on the profile header, 36 on ride cards. */
  size: number;
  /** Omit for decorative avatars next to a visible name. */
  accessibilityLabel?: string;
};

const STROKE_WIDTH = 1.5;

/**
 * Round rider photo with the design's white 1.5 pt inner stroke and raised shadow
 * (gKG8D "Avatar"). Falls back to a muted disc with a user glyph.
 */
export function ProfileAvatar({ source, size, accessibilityLabel }: ProfileAvatarProps) {
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[styles.container, round]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {source ? (
        <Image source={source} contentFit="cover" style={[StyleSheet.absoluteFill, round]} />
      ) : (
        <View style={[styles.fallback, round]}>
          <User width={size / 2} height={size / 2} color={colors.textTertiary} />
        </View>
      )}
      <View style={[styles.stroke, round]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    boxShadow: shadows.raised,
    backgroundColor: colors.surfaceMuted,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stroke: {
    ...StyleSheet.absoluteFill,
    borderWidth: STROKE_WIDTH,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
});
