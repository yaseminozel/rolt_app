import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { DesignFade } from './DesignFade';
import {
  DESIGN_CANVAS,
  designFrameStyle,
  useAnimationClock,
  wrap,
  SCENE_GESTURES_ENABLED,
} from './designCanvas';

/** "Kolaj" (`nAKft`): three card columns, 522 × 753, tilted 12°. */
const COLLAGE = {
  x: -137.07528686523438,
  y: -64.00762939453125,
  width: 522,
  height: 753,
  rotation: 12,
};
const COLUMN_WIDTH = 166;
const COLUMN_GAP = 12;
/** Three 211 pt cards with 12 pt gaps; one strip ends with one gap so copies tile seamlessly. */
const STRIP_HEIGHT = 669;
/** Strip exports keep 28 pt around the cards so their shadows aren't cut at the column edges. */
const SHADOW_ROOM = 28;
/** Copies per column: enough to cover the 753 pt column at any loop offset. */
const STRIP_COPIES = 3;
/** Auto-scroll eases out under the finger and back in after release. */
const HOLD_EASE_MS = 160;
const RELEASE_EASE_MS = 700;
/** Vertical drag scrubs the collage; a sideways swipe is left to the pager. */
const DRAG_ACTIVATION = 8;
const SWIPE_FAIL = 12;

type Column = {
  strip: ImageSource;
  /** Top of the first card in the design (columns 1 and 3 start 96 pt lower). */
  top: number;
  direction: 'up' | 'down';
  /** Time for the column to move one strip; different speeds keep the motion organic. */
  loopMs: number;
};

const columns: readonly Column[] = [
  {
    strip: require('../../../assets/images/onboarding/discover-column-1.webp'),
    top: 96,
    direction: 'up',
    loopMs: 30000,
  },
  {
    strip: require('../../../assets/images/onboarding/discover-column-2.webp'),
    top: 0,
    direction: 'down',
    loopMs: 26000,
  },
  {
    strip: require('../../../assets/images/onboarding/discover-column-3.webp'),
    top: 96,
    direction: 'up',
    loopMs: 34000,
  },
];

type DiscoverCollageProps = { running: boolean };

/**
 * 01.01 Keşfet illustration (`EAG9T` "Görsel"): the tilted route card collage drifts as an
 * endless marquee, columns alternating up and down. Touching it holds the marquee; dragging
 * up or down scrubs every column under the finger and a flick keeps them gliding before the
 * drift takes over again. Card strips are exports of the design's columns (sample Turkish
 * route names are part of the art).
 */
export function DiscoverCollage({ running }: DiscoverCollageProps) {
  const rate = useSharedValue(1);
  const clock = useAnimationClock(running, rate);
  const drag = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(SCENE_GESTURES_ENABLED)
    .activeOffsetY([-DRAG_ACTIVATION, DRAG_ACTIVATION])
    .failOffsetX([-SWIPE_FAIL, SWIPE_FAIL])
    .onBegin(() => {
      cancelAnimation(drag);
      rate.set(withTiming(0, { duration: HOLD_EASE_MS }));
    })
    .onStart(() => {
      dragStart.value = drag.value;
    })
    .onUpdate((event) => {
      drag.value = dragStart.value + event.translationY;
    })
    .onEnd((event) => {
      drag.value = withDecay({ velocity: event.velocityY });
    })
    .onFinalize(() => {
      rate.set(withTiming(1, { duration: RELEASE_EASE_MS }));
    });

  return (
    <>
      <GestureDetector gesture={pan}>
        <View style={styles.touchArea}>
          <View style={[designFrameStyle(COLLAGE), styles.collage]}>
            {columns.map((column, index) => (
              <CollageColumn key={index} column={column} index={index} clock={clock} drag={drag} />
            ))}
          </View>
        </View>
      </GestureDetector>
      {/* "Geçiş" and "Üst geçiş" */}
      <DesignFade top={250} height={270} stops={bottomFade} />
      <DesignFade top={0} height={110} stops={topFade} />
    </>
  );
}

const bottomFade = [
  { offset: 0, opacity: 0 },
  { offset: 0.7, opacity: 0.92 },
  { offset: 1, opacity: 1 },
] as const;
const topFade = [
  { offset: 0, opacity: 0.95 },
  { offset: 1, opacity: 0 },
] as const;

type CollageColumnProps = {
  column: Column;
  index: number;
  clock: SharedValue<number>;
  /** Shared finger offset, so all columns follow the drag together. */
  drag: SharedValue<number>;
};

function CollageColumn({ column, index, clock, drag }: CollageColumnProps) {
  const { top, direction, loopMs } = column;
  const animatedStyle = useAnimatedStyle(() => {
    const drift = (clock.value / loopMs) * STRIP_HEIGHT * (direction === 'up' ? -1 : 1);
    // First copy sits within one strip above the top, so three copies always cover the column.
    return {
      transform: [
        {
          translateY: wrap(top + drift + drag.value, STRIP_HEIGHT) - STRIP_HEIGHT,
        },
      ],
    };
  });

  return (
    <View style={[styles.column, { left: index * (COLUMN_WIDTH + COLUMN_GAP) }]}>
      <Animated.View style={animatedStyle}>
        {Array.from({ length: STRIP_COPIES }, (_, copy) => (
          <Image
            key={copy}
            source={column.strip}
            style={[styles.strip, { top: copy * STRIP_HEIGHT - SHADOW_ROOM }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
  },
  collage: {
    overflow: 'hidden',
  },
  column: {
    position: 'absolute',
    top: 0,
    width: COLUMN_WIDTH,
    height: COLLAGE.height,
  },
  strip: {
    position: 'absolute',
    left: -SHADOW_ROOM,
    width: COLUMN_WIDTH + SHADOW_ROOM * 2,
    height: STRIP_HEIGHT + SHADOW_ROOM * 2,
  },
});
