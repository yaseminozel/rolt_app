import { Image } from 'expo-image';
import { User } from 'iconoir-react-native';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, fontFamily, shadows } from '@/theme';

type ProfileAvatarProps = {
  source?: ImageSourcePropType;
  /** 52 on the profile header, 36 on ride cards. */
  size: number;
  /** Omit for decorative avatars next to a visible name. */
  accessibilityLabel?: string;
  /** Shown on a teal disc when there is no photo ("Baş harfler", 09.01 new rider "YA"). */
  initials?: string;
};

const STROKE_WIDTH = 1.5;

/**
 * Round rider photo with the design's white 1.5 pt inner stroke and raised shadow
 * (gKG8D "Avatar"). Without a photo: the rider's initials on teal, or a muted disc with a user
 * glyph.
 */
export function ProfileAvatar({ source, size, accessibilityLabel, initials }: ProfileAvatarProps) {
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
      ) : initials ? (
        <View style={[styles.fallback, styles.initialsDisc, round]}>
          <Text style={[styles.initials, { fontSize: Math.round(size * 0.35) }]} numberOfLines={1}>
            {initials}
          </Text>
        </View>
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
  initialsDisc: {
    backgroundColor: colors.accentSubtle,
  },
  initials: {
    fontFamily: fontFamily.semibold,
    color: colors.accentVivid,
  },
  stroke: {
    ...StyleSheet.absoluteFill,
    borderWidth: STROKE_WIDTH,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
});
