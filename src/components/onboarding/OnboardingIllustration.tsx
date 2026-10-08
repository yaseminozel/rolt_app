import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/theme';

import { DESIGN_CANVAS } from './designCanvas';
import { DiscoverCollage } from './DiscoverCollage';
import { RecordRouteScene } from './RecordRouteScene';
import { ShareOrbit } from './ShareOrbit';

export type OnboardingIllustrationKey = 'discover' | 'record' | 'share';

type OnboardingIllustrationProps = {
  page: OnboardingIllustrationKey;
  /** Only the page on screen animates. */
  active: boolean;
  width: number;
  height: number;
};

/**
 * Animated "Görsel" frame (393 × 520) of an onboarding page. The scene is laid out in design
 * coordinates and scaled to cover the given box, cropping top and bottom on short screens like
 * the old still image did. Each scene reacts to touch: vertical drags and taps play with the
 * art, while sideways swipes fail its gestures and page the pager. Decorative only, so hidden
 * from screen readers. With reduced motion every scene holds a still pose.
 */
export function OnboardingIllustration({
  page,
  active,
  width,
  height,
}: OnboardingIllustrationProps) {
  const reduceMotion = useReducedMotion();
  const running = active && !reduceMotion;
  const scale = Math.max(width / DESIGN_CANVAS.width, height / DESIGN_CANVAS.height);

  return (
    <View
      style={[styles.frame, { width, height }]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.canvas,
          {
            left: (width - DESIGN_CANVAS.width) / 2,
            top: (height - DESIGN_CANVAS.height) / 2,
            transform: [{ scale }],
          },
        ]}>
        {page === 'discover' ? <DiscoverCollage running={running} /> : null}
        {page === 'record' ? (
          <RecordRouteScene running={running} reduceMotion={reduceMotion} />
        ) : null}
        {page === 'share' ? <ShareOrbit running={running} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  canvas: {
    position: 'absolute',
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
    overflow: 'hidden',
  },
});
