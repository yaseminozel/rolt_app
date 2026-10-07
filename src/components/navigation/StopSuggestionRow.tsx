import { CoffeeCup, Gas, MapPin, Wrench } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { MountainIcon } from '@/components/registration/icons/MountainIcon';
import type { StopCategory } from '@/features/navigation/stops';
import { colors, fontFamily, radius, spacing } from '@/theme';

const ROW_HEIGHT = 64;
const ICON_BOX = 40;

export const stopCategoryIcons: Record<StopCategory, ComponentType<SvgProps>> = {
  fuel: Gas,
  cafe: CoffeeCup,
  mechanic: Wrench,
  viewpoint: MountainIcon,
};

export type DetourTone = 'neutral' | 'onRoute' | 'far';

type StopSuggestionRowProps = {
  name: string;
  /** "Rota üzerinde · 4,2. km". */
  detail: string;
  category?: StopCategory;
  badge: { label: string; tone: DetourTone };
  onPress: () => void;
};

const badgeTones: Record<DetourTone, { surface: string; text: string }> = {
  neutral: { surface: colors.surfaceMuted, text: colors.textPrimary },
  onRoute: { surface: colors.onRouteSurface, text: colors.onRouteText },
  far: { surface: colors.farDetourSurface, text: colors.farDetourText },
};

/**
 * "Öneri" row of 06.02 "ROTA BOYUNCA" (`wozjI`): category glyph, name, where it sits on the
 * route and the deviation badge ("+1 dk", green "Rota üzerinde", orange when far).
 */
export function StopSuggestionRow({ name, detail, category, badge, onPress }: StopSuggestionRowProps) {
  const Icon = category ? stopCategoryIcons[category] : MapPin;
  const tone = badgeTones[badge.tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${detail}, ${badge.label}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconBox}>
        <Icon width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: tone.surface }]}>
        <Text style={[styles.badgeLabel, { color: tone.text }]}>{badge.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 13,
  },
  badgeLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
});
