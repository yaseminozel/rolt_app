import { useEffect } from 'react';
import { Platform, type ViewStyle } from 'react-native';
import {
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** The onboarding "Görsel" frame every scene is drawn in (Pencil coordinates). */
export const DESIGN_CANVAS = { width: 393, height: 520 } as const;

/**
 * Scene gestures run on iOS and Android. On web, gesture-handler blocks the browser's native
 * swipe under them (it ignores `touchAction`), which would stop the pager in the preview.
 */
export const SCENE_GESTURES_ENABLED = Platform.OS !== 'web';

/** Longest frame step the clock accepts, so a dropped frame or a resume doesn't jump. */
const MAX_FRAME_STEP_MS = 64;

export type DesignNode = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pencil rotation in degrees, counter-clockwise around the node's top-left corner. */
  rotation?: number;
};

/** Center of a Pencil node; Pencil rotates around the top-left corner, React Native around the center. */
export function designCenter({ x, y, width, height, rotation = 0 }: DesignNode) {
  const angle = (rotation * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return {
    x: x + halfWidth * Math.cos(angle) + halfHeight * Math.sin(angle),
    y: y - halfWidth * Math.sin(angle) + halfHeight * Math.cos(angle),
  };
}

/** Absolute style that places a (possibly rotated) Pencil node exactly where the design draws it. */
export function designFrameStyle(node: DesignNode): ViewStyle {
  const center = designCenter(node);
  return {
    position: 'absolute',
    left: center.x - node.width / 2,
    top: center.y - node.height / 2,
    width: node.width,
    height: node.height,
    transform: [{ rotate: `${-(node.rotation ?? 0)}deg` }],
  };
}

/**
 * Milliseconds the scene has been animating, advanced on the UI thread only while `running`
 * (the page is on screen and reduced motion is off), so hidden pages cost nothing and resume
 * where they stopped. `rate` (1 = real time) lets a scene ease its motion to a halt while the
 * user holds it.
 */
export function useAnimationClock(
  running: boolean,
  rate?: SharedValue<number>,
): SharedValue<number> {
  const elapsed = useSharedValue(0);
  const frame = useFrameCallback(({ timeSincePreviousFrame }) => {
    const step = Math.min(timeSincePreviousFrame ?? 0, MAX_FRAME_STEP_MS);
    elapsed.value += step * (rate ? rate.value : 1);
  }, false);

  useEffect(() => {
    frame.setActive(running);
    return () => frame.setActive(false);
  }, [frame, running]);

  return elapsed;
}

/** `value` folded into [0, period), also for negative values. */
export function wrap(value: number, period: number) {
  'worklet';
  return ((value % period) + period) % period;
}

/** Quick "pop" the scenes play on a tapped element: 1 → `peak` → 1. */
export function popScale(peak = 1.12) {
  'worklet';
  return withSequence(
    withTiming(peak, { duration: 110 }),
    withSpring(1, { damping: 9, stiffness: 220 }),
  );
}
