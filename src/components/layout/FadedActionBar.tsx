import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, spacing } from '@/theme';

/** Button (44) plus the 16 pt top padding of the bar (05.04 `TboYF`, 09.06 "Aksiyon"). */
export const FADED_ACTION_BAR_HEIGHT = 44 + spacing.lg;

/**
 * Bottom-pinned actions over a white fade, so content scrolling underneath stays legible
 * (05.04 "Rotayı sürmeye başla", 09.06 "Paylaş" / "Rotayı tekrar sür").
 */
export function FadedActionBar({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="actionBarFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.surface} stopOpacity={0} />
            <Stop offset="0.635" stopColor={colors.surface} stopOpacity={0.8} />
            <Stop offset="1" stopColor={colors.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#actionBarFade)" />
      </Svg>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
