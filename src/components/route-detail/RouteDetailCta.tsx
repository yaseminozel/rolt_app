import { Play } from 'iconoir-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';

/** Button (48, `size="lg"`) plus the 16 pt top padding of the bar (01.6 `e2l5J`). */
export const ROUTE_DETAIL_CTA_HEIGHT = 48 + spacing.lg;

type RouteDetailCtaProps = {
  label: string;
  onPress: () => void;
};

/**
 * Bottom-pinned "Rotayı sürmeye başla" (01.6 `WXrjR`): full-width contained button over a
 * white fade so sheet content scrolling underneath stays legible.
 */
export function RouteDetailCta({ label, onPress }: RouteDetailCtaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="ctaFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.surface} stopOpacity={0} />
            <Stop offset="0.635" stopColor={colors.surface} stopOpacity={0.8} />
            <Stop offset="1" stopColor={colors.surface} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ctaFade)" />
      </Svg>
      <Button label={label} icon={Play} size="lg" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
});
