import { Platform } from 'react-native';

import { LEAN_SENSOR_RULES, rawLeanDeg, upFromRotation } from './leanMath';

/** One reading: roll in degrees (uncalibrated) and how fast the phone is turning. */
export type LeanSample = { rawDeg: number; rateDegS: number; timestamp: number };

type Subscription = { remove: () => void };

/**
 * Motion sensors: iOS CoreMotion's fused attitude (gyro + accelerometer), Android's rotation
 * vector, through expo-sensors' DeviceMotion. The fused attitude follows the bike through a
 * bend, where the accelerometer alone would read "upright" (cornering force cancels the lean).
 * Web has no usable sensor; development web previews get a slow synthetic sway instead.
 */
export async function isLeanSensorAvailable() {
  if (Platform.OS === 'web') {
    return __DEV__;
  }
  const { DeviceMotion } = require('expo-sensors') as typeof import('expo-sensors');
  return DeviceMotion.isAvailableAsync().catch(() => false);
}

export function subscribeLean(onSample: (sample: LeanSample) => void, intervalMs: number = LEAN_SENSOR_RULES.sampleMs): Subscription {
  if (Platform.OS === 'web') {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const t = (Date.now() - startedAt) / 1000;
      onSample({ rawDeg: 1.2 + 0.4 * Math.sin(t * 0.8), rateDegS: 1, timestamp: Date.now() });
    }, intervalMs);
    return { remove: () => clearInterval(timer) };
  }
  const { DeviceMotion } = require('expo-sensors') as typeof import('expo-sensors');
  DeviceMotion.setUpdateInterval(intervalMs);
  return DeviceMotion.addListener((measurement) => {
    const { beta, gamma } = measurement.rotation;
    const rate = measurement.rotationRate;
    onSample({
      rawDeg: rawLeanDeg(upFromRotation(beta, gamma)),
      rateDegS: rate ? Math.hypot(rate.alpha, rate.beta, rate.gamma) : 0,
      timestamp: Date.now(),
    });
  });
}
