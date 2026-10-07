import { MapPin, MapsGoStraight, MapsTurnBack, MapsTurnLeft, MapsTurnRight } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import type { ManeuverModifier } from '@/features/navigation/types';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

const ICON_SIZE = 48;

export type GuidanceIcon = ManeuverModifier | 'roundabout' | 'arrive' | 'finish' | 'stopReached';

const glyphs: Record<ManeuverModifier | 'roundabout', ComponentType<SvgProps>> = {
  straight: MapsGoStraight,
  right: MapsTurnRight,
  slightRight: MapsTurnRight,
  sharpRight: MapsTurnRight,
  left: MapsTurnLeft,
  slightLeft: MapsTurnLeft,
  sharpLeft: MapsTurnLeft,
  uturn: MapsTurnBack,
  roundabout: MapsTurnRight,
};

const stopReachedImage = require('../../../assets/images/ride/stop-reached.png');
const finishImage = require('../../../assets/images/ride/finish-flag.png');

type GuidanceCardProps = {
  icon: GuidanceIcon;
  title: string;
  subtitle: string;
};

/**
 * "Yönlendirme kartı" (06.06): maneuver glyph, the instruction ("350 m sonra sağa dön") and the
 * road to take; on a stop arrival the reached-stop pin and "1. durağa ulaştın · Shell".
 */
export function GuidanceCard({ icon, title, subtitle }: GuidanceCardProps) {
  let glyph;
  if (icon === 'stopReached') {
    glyph = <Image source={stopReachedImage} style={styles.pin} resizeMode="contain" />;
  } else if (icon === 'arrive') {
    // Approaching a stop: a plain pin; the green check pin is kept for "ulaştın".
    glyph = <MapPin width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} strokeWidth={1.5} />;
  } else if (icon === 'finish') {
    glyph = <Image source={finishImage} style={styles.flag} resizeMode="contain" />;
  } else {
    const Glyph = glyphs[icon];
    glyph = <Glyph width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} strokeWidth={1.5} />;
  }

  return (
    <View style={styles.card} accessibilityRole="header" accessibilityLiveRegion="polite" accessible accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.icon}>{glyph}</View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.guidance,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 38,
    height: ICON_SIZE,
  },
  flag: {
    width: 36,
    height: 36,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
