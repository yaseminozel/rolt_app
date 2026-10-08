import { Image, type ImageSource } from 'expo-image';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { DesignFade } from './DesignFade';
import { DESIGN_CANVAS, useAnimationClock } from './designCanvas';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** "Rota / Çizgi" (`aKcuE`) and "Rota / Kenar" (`S2A2W6`): same curve, drawn at (-10, 120). */
const ROUTE_PATH = 'M0 0c40 30 60 60 94 76 56 26 146 44 142 104-4 60-116 70-100 130 14 60 114 70 174 110';
const ROUTE_OFFSET = { x: -10, y: 120 };
/** Length of `ROUTE_PATH` (react-native-svg can't measure paths on native). */
const ROUTE_LENGTH = 695;
const ROUTE_WIDTH = 6;
const ROUTE_EDGE_WIDTH = 12;
/** "Harita" (`xy25l`) is 393 × 852, 120 pt above the frame. */
const MAP = { top: -120, height: 852 };
/** Slightly zoomed so the slow pan never shows the map's edges. */
const MAP_ZOOM = 1.05;
const MAP_DRIFT = { x: 6, y: 9 };

/** One loop: draw the route, pop the stops as the line reaches them, show the recording strip, fade, repeat. */
const CYCLE_MS = 9000;
const DRAW_START_MS = 500;
const DRAW_MS = 2600;
const STRIP_IN_MS = DRAW_START_MS + DRAW_MS + 150;
const FADE_OUT_START_MS = 7900;
const FADE_OUT_MS = 500;
/** Everything shown; the still pose when reduced motion is on. */
const STILL_MS = 6000;
const PIN_POP_MS = 420;
const FADE_IN_MS = 200;
const STRIP_RISE = 12;

type StopPin = {
  image: ImageSource;
  /** Exported pin + number badge with 20 pt room for the shadow, in design coordinates. */
  frame: { left: number; top: number; width: number; height: number };
  /** Tip of the pin's tail on the route; the pin grows from here. */
  tail: { x: number; y: number };
  /** Share of the route length where the tail sits. */
  at: number;
};

const pins: readonly StopPin[] = [
  {
    image: require('../../../assets/images/onboarding/record-pin-1.png'),
    frame: { left: 20, top: 79, width: 120, height: 137 },
    tail: { x: 84, y: 195.5 },
    at: 0.1745,
  },
  {
    image: require('../../../assets/images/onboarding/record-pin-2.png'),
    frame: { left: 145.8, top: 142.95, width: 153, height: 178 },
    tail: { x: 226, y: 300 },
    at: 0.4444,
  },
  {
    image: require('../../../assets/images/onboarding/record-pin-3.png'),
    frame: { left: 62, top: 313, width: 120, height: 137 },
    tail: { x: 126, y: 429.5 },
    at: 0.695,
  },
];

/** "Kayıt şeridi" (`PWAsi`) with 24 pt room for its shadow. */
const STRIP_FRAME = { left: 18, top: 434, width: 358, height: 86 };

type RecordRouteSceneProps = { running: boolean; reduceMotion: boolean };

/**
 * 01.02 Sür ve kaydet illustration (`l3qzJM` "Görsel"): over a slowly panning map the route
 * draws itself, the photo stops pop up as the line reaches them, then the recording strip
 * slides in. The map is the design's artwork, not a live Mapbox view (first launch may have
 * no network; Expo Go has no Mapbox).
 */
export function RecordRouteScene({ running, reduceMotion }: RecordRouteSceneProps) {
  const clock = useAnimationClock(running);

  const mapStyle = useAnimatedStyle(() => {
    const t = reduceMotion ? STILL_MS : clock.value % CYCLE_MS;
    const angle = (t / CYCLE_MS) * Math.PI * 2;
    return {
      transform: [
        { translateX: MAP_DRIFT.x * Math.sin(angle) },
        { translateY: MAP_DRIFT.y * Math.cos(angle) },
        { scale: MAP_ZOOM },
      ],
    };
  });
  const routeStyle = useAnimatedStyle(() => {
    const t = reduceMotion ? STILL_MS : clock.value % CYCLE_MS;
    return { opacity: visibleBetween(t, DRAW_START_MS) };
  });
  const stripStyle = useAnimatedStyle(() => {
    const t = reduceMotion ? STILL_MS : clock.value % CYCLE_MS;
    const rise = interpolate(t, [STRIP_IN_MS, STRIP_IN_MS + PIN_POP_MS], [STRIP_RISE, 0], Extrapolation.CLAMP);
    return { opacity: visibleBetween(t, STRIP_IN_MS), transform: [{ translateY: rise }] };
  });

  return (
    <>
      <Animated.View style={[styles.layer, mapStyle]}>
        <Image source={require('../../../assets/images/onboarding/record-map.jpg')} style={styles.map} />
        <Animated.View style={[styles.layer, routeStyle]}>
          <Svg width={DESIGN_CANVAS.width} height={DESIGN_CANVAS.height}>
            <G x={ROUTE_OFFSET.x} y={ROUTE_OFFSET.y}>
              <RouteStroke color={colors.surface} width={ROUTE_EDGE_WIDTH} clock={clock} reduceMotion={reduceMotion} />
              <RouteStroke color={colors.brand} width={ROUTE_WIDTH} clock={clock} reduceMotion={reduceMotion} />
            </G>
          </Svg>
        </Animated.View>
        {pins.map((pin) => (
          <RoutePin key={pin.at} pin={pin} clock={clock} reduceMotion={reduceMotion} />
        ))}
      </Animated.View>
      {/* "Geçiş" and "Üst geçiş" */}
      <DesignFade top={254} height={270} stops={bottomFade} />
      <DesignFade top={0} height={100} stops={topFade} />
      <Animated.View style={[styles.strip, stripStyle]}>
        <Image source={require('../../../assets/images/onboarding/record-strip.png')} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );
}

/** Opacity of an element that fades in at `start` and out with the rest of the loop. */
function visibleBetween(t: number, start: number) {
  'worklet';
  return interpolate(
    t,
    [start, start + FADE_IN_MS, FADE_OUT_START_MS, FADE_OUT_START_MS + FADE_OUT_MS],
    [0, 1, 1, 0],
    Extrapolation.CLAMP,
  );
}

const bottomFade = [
  { offset: 0, opacity: 0 },
  { offset: 0.65, opacity: 0.9 },
  { offset: 1, opacity: 1 },
] as const;
const topFade = [
  { offset: 0, opacity: 0.95 },
  { offset: 1, opacity: 0 },
] as const;

type RouteStrokeProps = { color: string; width: number; clock: SharedValue<number>; reduceMotion: boolean };

/** One stroke of the route, revealed from its start by moving the dash offset. */
function RouteStroke({ color, width, clock, reduceMotion }: RouteStrokeProps) {
  const animatedProps = useAnimatedProps(() => {
    const t = reduceMotion ? STILL_MS : clock.value % CYCLE_MS;
    const drawn = interpolate(t, [DRAW_START_MS, DRAW_START_MS + DRAW_MS], [0, 1], Extrapolation.CLAMP);
    return { strokeDashoffset: ROUTE_LENGTH * (1 - drawn) };
  });
  return (
    <AnimatedPath
      d={ROUTE_PATH}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[ROUTE_LENGTH, ROUTE_LENGTH]}
      animatedProps={animatedProps}
    />
  );
}

function RoutePin({ pin, clock, reduceMotion }: { pin: StopPin; clock: SharedValue<number>; reduceMotion: boolean }) {
  const arrival = DRAW_START_MS + pin.at * DRAW_MS;
  const animatedStyle = useAnimatedStyle(() => {
    const t = reduceMotion ? STILL_MS : clock.value % CYCLE_MS;
    const scale = interpolate(
      t,
      [arrival, arrival + PIN_POP_MS * 0.6, arrival + PIN_POP_MS],
      [0.4, 1.08, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: visibleBetween(t, arrival), transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        styles.pin,
        pin.frame,
        { transformOrigin: [pin.tail.x - pin.frame.left, pin.tail.y - pin.frame.top, 0] },
        animatedStyle,
      ]}>
      <Image source={pin.image} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
  },
  map: {
    position: 'absolute',
    top: MAP.top,
    left: 0,
    width: DESIGN_CANVAS.width,
    height: MAP.height,
  },
  pin: {
    position: 'absolute',
  },
  strip: {
    position: 'absolute',
    ...STRIP_FRAME,
  },
});
