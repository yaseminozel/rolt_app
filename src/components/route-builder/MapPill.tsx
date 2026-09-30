import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

/**
 * - `inverse`: dark pill ("73 km · ~1 sa 45 dk", "Haritayı sürükleyerek…").
 * - `surface`: white pill with a shadow ("Haritada düzenle", "En uygun yol aranıyor").
 * - `translucent`: 90 % white hint over the empty preview ("Noktaları seçince…").
 * - `danger`: red pill ("Rota oluşturulamadı").
 */
export type MapPillTone = 'inverse' | 'surface' | 'translucent' | 'danger';

type ToneSpec = { background: string; text: string; icon: string; shadow?: string };

const TONES: Record<MapPillTone, ToneSpec> = {
  inverse: { background: colors.surfaceInverse, text: colors.textInverse, icon: colors.textInverse },
  surface: { background: colors.surface, text: colors.textPrimary, icon: colors.textPrimary, shadow: shadows.mapPill },
  translucent: { background: colors.mapHintSurface, text: colors.textBody, icon: colors.textSecondary },
  danger: { background: colors.dangerText, text: colors.textInverse, icon: colors.textInverse },
};

const ICON_SIZE = 13;

export type MapPillProps = {
  label: string;
  tone?: MapPillTone;
  icon?: ComponentType<SvgProps>;
  /** Replaces the icon with a small spinner ("En uygun yol aranıyor"). */
  loading?: boolean;
  /** Semibold label (value and action pills); hints use medium. */
  emphasized?: boolean;
  onPress?: () => void;
  /** Hints may wrap to two lines on narrow screens; values stay on one. */
  numberOfLines?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Small rounded label floating over a map or the route preview card (04.1). */
export function MapPill({ label, tone = 'surface', icon: Icon, loading = false, emphasized = false, onPress, numberOfLines = 1, accessibilityLabel, style }: MapPillProps) {
  const spec = TONES[tone];
  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={colors.brand} style={styles.spinner} />
      ) : Icon ? (
        <Icon width={ICON_SIZE} height={ICON_SIZE} color={spec.icon} strokeWidth={1.8} />
      ) : null}
      <Text
        style={[emphasized ? styles.labelEmphasized : styles.label, { color: spec.text }]}
        numberOfLines={numberOfLines}>
        {label}
      </Text>
    </>
  );
  const pillStyle = [styles.pill, { backgroundColor: spec.background, boxShadow: spec.shadow }, loading && styles.loadingPill];

  if (onPress) {
    // 29 pt pill, hit area extended to the 44 pt minimum.
    const slop = (layout.minTouchTarget - 29) / 2;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        hitSlop={{ top: slop, bottom: slop, left: spacing.xs, right: spacing.xs }}
        style={({ pressed }) => [pillStyle, pressed && { backgroundColor: colors.surfacePressed }, style]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[pillStyle, style]} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  loadingPill: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  spinner: {
    width: 14,
    height: 14,
    transform: [{ scale: 0.7 }],
  },
  label: {
    ...typography.captionMedium,
    lineHeight: 15,
    flexShrink: 1,
  },
  labelEmphasized: {
    ...typography.caption,
    fontFamily: typography.bodySemibold.fontFamily,
    lineHeight: 15,
    flexShrink: 1,
  },
});
