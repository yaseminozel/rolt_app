import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radius, shadows, typography } from '@/theme';

import { DesignFade } from './DesignFade';
import {
  DESIGN_CANVAS,
  designCenter,
  popScale,
  useAnimationClock,
  type DesignNode,
  SCENE_GESTURES_ENABLED,
} from './designCanvas';

/** Center of the rings and the logo (`PTCzu`, `W7NIJ`). */
const ORBIT_CENTER = { x: 196, y: 262 };
/** Square the items orbit in; larger than the ring the items sit on (≈ 176 pt radius). */
const ORBIT_SIZE = 520;
/** One full turn of the orbit. */
const ORBIT_MS = 80000;
/** "Halka / İç, Orta, Dış" (`FudyB`, `e8eoP`, `PTCzu`), exported with 40 pt room for their shadow. */
const rings = [
  {
    image: require('../../../assets/images/onboarding/share-ring-inner.webp'),
    left: 68,
    top: 134,
    size: 256,
  },
  {
    image: require('../../../assets/images/onboarding/share-ring-middle.webp'),
    left: -14,
    top: 52,
    size: 420,
  },
  {
    image: require('../../../assets/images/onboarding/share-ring-outer.webp'),
    left: -79,
    top: -13,
    size: 550,
  },
] as const;
/** The rings pulse from the logo outwards: a short beat, inner ring first, then a rest. */
const PULSE_MS = 3200;
const PULSE_BEAT_SHARE = 0.4;
const PULSE_RING_DELAY_MS = 220;
const PULSE_GROWTH = 0.035;
const LOGO_PULSE_GROWTH = 0.04;
/** Room around each exported item for its 3 pt outline and shadow. */
const ITEM_PADDING = 22;
/** "Logo" (`W7NIJ`): 96 pt brand tile, drawn natively so the wordmark stays sharp. */
const LOGO_SIZE = 96;
/** Spinning eases out under the finger and back in after release. */
const HOLD_EASE_MS = 160;
const RELEASE_EASE_MS = 900;
/** Vertical drag spins the orbit; a sideways swipe is left to the pager. */
const DRAG_ACTIVATION = 8;
const SWIPE_FAIL = 12;
/** A flick keeps spinning and slows down at this rate. */
const SPIN_DECELERATION = 0.995;

type OrbitItem = { image: ImageSource; node: DesignNode };

/** "Yörünge / …" nodes: photos, avatars and share posters around the logo. */
const items: readonly OrbitItem[] = [
  {
    image: require('../../../assets/images/onboarding/share-poster-2.webp'),
    node: {
      x: 161.27078247070312,
      y: 46.752197265625,
      width: 72,
      height: 90,
      rotation: -6,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-1.webp'),
    node: {
      x: 266.9234924316406,
      y: 95.46710968017578,
      width: 58,
      height: 58,
      rotation: 8,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-2.webp'),
    node: {
      x: 334.6795959472656,
      y: 176.467041015625,
      width: 66,
      height: 66,
      rotation: -6,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-avatar-photo.webp'),
    node: {
      x: 332.6795959472656,
      y: 289.53289794921875,
      width: 50,
      height: 50,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-3.webp'),
    node: {
      x: 266.89886474609375,
      y: 367,
      width: 66,
      height: 66,
      rotation: -6,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-4.webp'),
    node: { x: 167, y: 397, width: 58, height: 58, rotation: 8 },
  },
  {
    image: require('../../../assets/images/onboarding/share-poster-1.webp'),
    node: {
      x: 61.49983215332031,
      y: 364.3825988769531,
      width: 64,
      height: 80,
      rotation: 5.6,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-5.webp'),
    node: {
      x: -9.804884910583496,
      y: 287.6586608886719,
      width: 73.2739028930664,
      height: 58,
      rotation: 8,
    },
  },
  {
    image: require('../../../assets/images/onboarding/share-avatar-initials.webp'),
    node: { x: 9.3203125, y: 184.4671630859375, width: 50, height: 50 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-6.webp'),
    node: { x: 56, y: 101.0720443725586, width: 58, height: 58, rotation: 8 },
  },
];

type ShareOrbitProps = { running: boolean };

/**
 * 01.03 Paylaş illustration (`bblG8` "Görsel"): the photos, avatars and posters slowly orbit
 * the ROLT logo, each staying upright at its design tilt, while the rings pulse outwards from the logo. Dragging
 * spins the orbit around the logo like a dial (a flick keeps it turning), and tapping the logo
 * or an item pops it. Rings and items are exports; the logo is native.
 */
export function ShareOrbit({ running }: ShareOrbitProps) {
  const rate = useSharedValue(1);
  const clock = useAnimationClock(running, rate);
  /** Degrees added by the user's spins on top of the slow automatic turn. */
  const spin = useSharedValue(0);
  const lastTouchAngle = useSharedValue(0);
  const logoPop = useSharedValue(1);
  const itemPops = items.map(() => useSharedValue(1)); // eslint-disable-line react-hooks/rules-of-hooks -- fixed-length list

  const pan = Gesture.Pan()
    .enabled(SCENE_GESTURES_ENABLED)
    .activeOffsetY([-DRAG_ACTIVATION, DRAG_ACTIVATION])
    .failOffsetX([-SWIPE_FAIL, SWIPE_FAIL])
    .onBegin((event) => {
      cancelAnimation(spin);
      rate.set(withTiming(0, { duration: HOLD_EASE_MS }));
      lastTouchAngle.set(touchAngle(event.x, event.y));
    })
    .onUpdate((event) => {
      const angle = touchAngle(event.x, event.y);
      // Shortest way round, so crossing ±180° doesn't flip the orbit.
      const delta = ((angle - lastTouchAngle.get() + 540) % 360) - 180;
      spin.set(spin.get() + delta);
      lastTouchAngle.set(angle);
    })
    .onEnd((event) => {
      // Angular speed of the finger around the center (deg/s): (r × v) / |r|².
      const dx = event.x - ORBIT_CENTER.x;
      const dy = event.y - ORBIT_CENTER.y;
      const distanceSquared = Math.max(dx * dx + dy * dy, 1);
      const angularVelocity =
        ((dx * event.velocityY - dy * event.velocityX) / distanceSquared) * (180 / Math.PI);
      spin.set(
        withDecay({
          velocity: angularVelocity,
          deceleration: SPIN_DECELERATION,
        }),
      );
    })
    .onFinalize(() => {
      rate.set(withTiming(1, { duration: RELEASE_EASE_MS }));
    });
  const tap = Gesture.Tap()
    .enabled(SCENE_GESTURES_ENABLED)
    .onEnd((event) => {
      const dx = event.x - ORBIT_CENTER.x;
      const dy = event.y - ORBIT_CENTER.y;
      if (Math.abs(dx) <= LOGO_SIZE / 2 && Math.abs(dy) <= LOGO_SIZE / 2) {
        logoPop.set(popScale(1.15));
        return;
      }
      // Items sit on the turned orbit: undo the turn to find which one is under the finger.
      const turn = (-(orbitAngle(clock.get()) + spin.get()) * Math.PI) / 180;
      const x = ORBIT_CENTER.x + dx * Math.cos(turn) - dy * Math.sin(turn);
      const y = ORBIT_CENTER.y + dx * Math.sin(turn) + dy * Math.cos(turn);
      for (let index = 0; index < itemCenters.length; index += 1) {
        const item = itemCenters[index];
        if (Math.abs(x - item.x) <= item.halfWidth && Math.abs(y - item.y) <= item.halfHeight) {
          itemPops[index].set(popScale(1.18));
          return;
        }
      }
    });

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoPop.value * (1 + LOGO_PULSE_GROWTH * pulse(clock.value, 0)) }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAngle(clock.value) + spin.value}deg` }],
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={styles.canvas}>
        {[...rings].reverse().map((ring, index) => (
          <PulsingRing key={ring.size} ring={ring} order={rings.length - 1 - index} clock={clock} />
        ))}
        <Animated.View style={[styles.logo, logoStyle]}>
          <Text style={styles.logoText}>ROLT</Text>
        </Animated.View>
        <Animated.View style={[styles.orbit, orbitStyle]}>
          {items.map((item, index) => (
            <OrbitItemView
              key={index}
              item={item}
              clock={clock}
              spin={spin}
              pop={itemPops[index]}
            />
          ))}
        </Animated.View>
        {/* "Geçiş" */}
        <DesignFade top={358} height={162} stops={bottomFade} />
      </View>
    </GestureDetector>
  );
}

/** Design centers and tap areas of the items before any turn. */
const itemCenters = items.map(({ node }) => ({
  ...designCenter(node),
  halfWidth: node.width / 2,
  halfHeight: node.height / 2,
}));

/** 0 → 1 → 0 during the first part of each pulse period (shifted by `delayMs`), 0 while resting. */
function pulse(elapsedMs: number, delayMs: number) {
  'worklet';
  const phase = ((((elapsedMs - delayMs) % PULSE_MS) + PULSE_MS) % PULSE_MS) / PULSE_MS;
  return phase < PULSE_BEAT_SHARE ? Math.sin((phase / PULSE_BEAT_SHARE) * Math.PI) : 0;
}

type PulsingRingProps = {
  ring: (typeof rings)[number];
  /** 0 = innermost; outer rings beat later so the pulse travels outwards. */
  order: number;
  clock: SharedValue<number>;
};

function PulsingRing({ ring, order, clock }: PulsingRingProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + PULSE_GROWTH * pulse(clock.value, order * PULSE_RING_DELAY_MS) }],
  }));
  return (
    <Animated.View
      style={[
        styles.ring,
        { left: ring.left, top: ring.top, width: ring.size, height: ring.size },
        animatedStyle,
      ]}>
      <Image source={ring.image} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Direction of a touch seen from the orbit center, in degrees. */
function touchAngle(x: number, y: number) {
  'worklet';
  return (Math.atan2(y - ORBIT_CENTER.y, x - ORBIT_CENTER.x) * 180) / Math.PI;
}

const bottomFade = [
  { offset: 0, opacity: 0 },
  { offset: 0.7, opacity: 0.9 },
  { offset: 1, opacity: 1 },
] as const;

function orbitAngle(elapsedMs: number) {
  'worklet';
  return ((elapsedMs % ORBIT_MS) / ORBIT_MS) * 360;
}

type OrbitItemViewProps = {
  item: OrbitItem;
  clock: SharedValue<number>;
  spin: SharedValue<number>;
  pop: SharedValue<number>;
};

function OrbitItemView({ item, clock, spin, pop }: OrbitItemViewProps) {
  const center = designCenter(item.node);
  const width = item.node.width + ITEM_PADDING * 2;
  const height = item.node.height + ITEM_PADDING * 2;
  const tilt = -(item.node.rotation ?? 0);
  // Cancels the orbit's turn so the item keeps its design tilt.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tilt - orbitAngle(clock.value) - spin.value}deg` },
      { scale: pop.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.item,
        {
          left: center.x - (ORBIT_CENTER.x - ORBIT_SIZE / 2) - width / 2,
          top: center.y - (ORBIT_CENTER.y - ORBIT_SIZE / 2) - height / 2,
          width,
          height,
        },
        animatedStyle,
      ]}>
      <Image source={item.image} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
  },
  ring: {
    position: 'absolute',
  },
  logo: {
    position: 'absolute',
    left: ORBIT_CENTER.x - LOGO_SIZE / 2,
    top: ORBIT_CENTER.y - LOGO_SIZE / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.appTile,
    borderCurve: 'continuous',
    backgroundColor: colors.brand,
    boxShadow: shadows.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...typography.wordmarkTile,
    color: colors.textInverse,
  },
  orbit: {
    position: 'absolute',
    left: ORBIT_CENTER.x - ORBIT_SIZE / 2,
    top: ORBIT_CENTER.y - ORBIT_SIZE / 2,
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
  },
  item: {
    position: 'absolute',
  },
});
