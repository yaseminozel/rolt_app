import { Image, type ImageSource } from 'expo-image';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { DesignFade } from './DesignFade';
import { DESIGN_CANVAS, designCenter, useAnimationClock, type DesignNode } from './designCanvas';

/** Center of the rings and the logo (`PTCzu`, `W7NIJ`). */
const ORBIT_CENTER = { x: 196, y: 262 };
/** Square the items orbit in; larger than the ring the items sit on (≈ 176 pt radius). */
const ORBIT_SIZE = 520;
/** One full turn of the orbit. */
const ORBIT_MS = 80000;
/** Rings and logo breathe gently while the orbit turns. */
const BREATHE_MS = 6000;
const BREATHE_SCALE = 0.012;
/** Room around each exported item for its 3 pt outline and shadow. */
const ITEM_PADDING = 22;

type OrbitItem = { image: ImageSource; node: DesignNode };

/** "Yörünge / …" nodes: photos, avatars and share posters around the logo. */
const items: readonly OrbitItem[] = [
  {
    image: require('../../../assets/images/onboarding/share-poster-2.png'),
    node: { x: 161.27078247070312, y: 46.752197265625, width: 72, height: 90, rotation: -6 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-1.png'),
    node: { x: 266.9234924316406, y: 95.46710968017578, width: 58, height: 58, rotation: 8 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-2.png'),
    node: { x: 334.6795959472656, y: 176.467041015625, width: 66, height: 66, rotation: -6 },
  },
  {
    image: require('../../../assets/images/onboarding/share-avatar-photo.png'),
    node: { x: 332.6795959472656, y: 289.53289794921875, width: 50, height: 50 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-3.png'),
    node: { x: 266.89886474609375, y: 367, width: 66, height: 66, rotation: -6 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-4.png'),
    node: { x: 167, y: 397, width: 58, height: 58, rotation: 8 },
  },
  {
    image: require('../../../assets/images/onboarding/share-poster-1.png'),
    node: { x: 61.49983215332031, y: 364.3825988769531, width: 64, height: 80, rotation: 5.6 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-5.png'),
    node: { x: -9.804884910583496, y: 287.6586608886719, width: 73.2739028930664, height: 58, rotation: 8 },
  },
  {
    image: require('../../../assets/images/onboarding/share-avatar-initials.png'),
    node: { x: 9.3203125, y: 184.4671630859375, width: 50, height: 50 },
  },
  {
    image: require('../../../assets/images/onboarding/share-photo-6.png'),
    node: { x: 56, y: 101.0720443725586, width: 58, height: 58, rotation: 8 },
  },
];

type ShareOrbitProps = { running: boolean };

/**
 * 01.03 Paylaş illustration (`bblG8` "Görsel"): the photos, avatars and posters slowly orbit
 * the ROLT logo, each staying upright at its design tilt, while the rings breathe. Rings and
 * logo are one export; every orbit item is its own export.
 */
export function ShareOrbit({ running }: ShareOrbitProps) {
  const clock = useAnimationClock(running);

  const ringsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + BREATHE_SCALE * Math.sin((clock.value / BREATHE_MS) * Math.PI * 2) }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAngle(clock.value)}deg` }],
  }));

  return (
    <>
      <Animated.View style={[styles.rings, ringsStyle]}>
        <Image source={require('../../../assets/images/onboarding/share-rings.jpg')} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.orbit, orbitStyle]}>
        {items.map((item, index) => (
          <OrbitItemView key={index} item={item} clock={clock} />
        ))}
      </Animated.View>
      {/* "Geçiş" */}
      <DesignFade top={358} height={162} stops={bottomFade} />
    </>
  );
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

function OrbitItemView({ item, clock }: { item: OrbitItem; clock: SharedValue<number> }) {
  const center = designCenter(item.node);
  const width = item.node.width + ITEM_PADDING * 2;
  const height = item.node.height + ITEM_PADDING * 2;
  const tilt = -(item.node.rotation ?? 0);
  // Cancels the orbit's turn so the item keeps its design tilt.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt - orbitAngle(clock.value)}deg` }],
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
  rings: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
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
