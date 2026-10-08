import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { DesignFade } from './DesignFade';
import { designFrameStyle, useAnimationClock } from './designCanvas';

/** "Kolaj" (`nAKft`): three card columns, 522 × 753, tilted 12°. */
const COLLAGE = { x: -137.07528686523438, y: -64.00762939453125, width: 522, height: 753, rotation: 12 };
const COLUMN_WIDTH = 166;
const COLUMN_GAP = 12;
/** Three 211 pt cards with 12 pt gaps; each strip image ends with one gap so copies tile seamlessly. */
const STRIP_HEIGHT = 669;
/** Copies per column: enough to cover the 753 pt column at any loop offset. */
const STRIP_COPIES = 3;

type Column = {
  strip: ImageSource;
  /** Top of the first card in the design (columns 1 and 3 start 96 pt lower). */
  top: number;
  direction: 'up' | 'down';
  /** Time for the column to move one strip; different speeds keep the motion organic. */
  loopMs: number;
};

const columns: readonly Column[] = [
  { strip: require('../../../assets/images/onboarding/discover-column-1.jpg'), top: 96, direction: 'up', loopMs: 30000 },
  { strip: require('../../../assets/images/onboarding/discover-column-2.jpg'), top: 0, direction: 'down', loopMs: 26000 },
  { strip: require('../../../assets/images/onboarding/discover-column-3.jpg'), top: 96, direction: 'up', loopMs: 34000 },
];

type DiscoverCollageProps = { running: boolean };

/**
 * 01.01 Keşfet illustration (`EAG9T` "Görsel"): the tilted route card collage drifts as an
 * endless marquee, columns alternating up and down. Card strips are exports of the design's
 * columns (sample Turkish route names are part of the art).
 */
export function DiscoverCollage({ running }: DiscoverCollageProps) {
  const clock = useAnimationClock(running);
  return (
    <>
      <View style={[designFrameStyle(COLLAGE), styles.collage]}>
        {columns.map((column, index) => (
          <CollageColumn key={index} column={column} index={index} clock={clock} />
        ))}
      </View>
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

function CollageColumn({ column, index, clock }: { column: Column; index: number; clock: SharedValue<number> }) {
  const { top, direction, loopMs } = column;
  const animatedStyle = useAnimatedStyle(() => {
    const progress = (clock.value % loopMs) / loopMs;
    const shift = (direction === 'up' ? -progress : progress) * STRIP_HEIGHT;
    // The first copy starts one strip above the design position, so both directions stay covered.
    return { transform: [{ translateY: top - STRIP_HEIGHT + shift }] };
  });

  return (
    <View style={[styles.column, { left: index * (COLUMN_WIDTH + COLUMN_GAP) }]}>
      <Animated.View style={animatedStyle}>
        {Array.from({ length: STRIP_COPIES }, (_, copy) => (
          <Image key={copy} source={column.strip} style={styles.strip} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  collage: {
    overflow: 'hidden',
  },
  column: {
    position: 'absolute',
    top: 0,
    width: COLUMN_WIDTH,
    height: COLLAGE.height,
    overflow: 'hidden',
  },
  strip: {
    width: COLUMN_WIDTH,
    height: STRIP_HEIGHT,
  },
});
