import { Minus, Plus } from 'iconoir-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows } from '@/theme';

const BUTTON_SIZE = 44;
const ICON_SIZE = 20;

type MapZoomControlProps = {
  zoomInLabel: string;
  zoomOutLabel: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** "Yakınlaştırma" (01.7 `jKcQQ`): stacked zoom in / out in one 44 × 88 pill. */
export function MapZoomControl({ zoomInLabel, zoomOutLabel, onZoomIn, onZoomOut, disabled = false, style }: MapZoomControlProps) {
  return (
    <View style={[styles.container, style]}>
      {[
        { key: 'in', Icon: Plus, label: zoomInLabel, onPress: onZoomIn },
        { key: 'out', Icon: Minus, label: zoomOutLabel, onPress: onZoomOut },
      ].map(({ key, Icon, label, onPress }) => (
        <Pressable
          key={key}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapControl,
    overflow: 'hidden',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
});
