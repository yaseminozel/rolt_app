import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, radius, shadows } from '@/theme';

const SIZES = {
  /** Top bar actions over maps: back, bookmark, layers (01.6 `qw5Tm`, 01.7 `f8509u`). */
  action: { size: 48, icon: 24, shadow: shadows.mapAction },
  /** Map controls such as "Konumuma git" (01.7 `rgmv0`; 01.6 `F9KRGq` is 48). */
  control: { size: 44, icon: 20, shadow: shadows.mapControl },
  controlLarge: { size: 48, icon: 20, shadow: shadows.mapControl },
  /** Back button beside the explore search field (07.01 "Back"). */
  field: { size: 44, icon: 20, shadow: shadows.mapField },
  /** "Konumum" and "Katmanlar" on the explore map (07.01 "Harita kontrolleri"). */
  fab: { size: 52, icon: 22, shadow: shadows.mapFab },
} as const;

export type MapActionButtonProps = {
  icon: ComponentType<SvgProps>;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: keyof typeof SIZES;
  /** Toggle buttons (bookmark, layers) report their state to assistive tech. */
  selected?: boolean;
  /** Icon tint, e.g. brand while "Konumum" keeps the map on the rider. */
  iconColor?: string;
  /** Drawn instead of `icon`, e.g. a download progress ring. */
  content?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round white button floating over a map. */
export function MapActionButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  size = 'action',
  selected,
  iconColor = colors.textPrimary,
  content,
  disabled = false,
  style,
}: MapActionButtonProps) {
  const spec = SIZES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.button,
        {
          width: spec.size,
          height: spec.size,
          boxShadow: spec.shadow,
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        },
        style,
      ]}>
      {content ?? <Icon width={spec.icon} height={spec.icon} color={iconColor} strokeWidth={1.5} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
