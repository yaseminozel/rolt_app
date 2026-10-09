import { BatteryState, useBatteryLevel, useBatteryState } from 'expo-battery';

/** Below these levels on battery power a long ride is at risk (user decision 2026-10-09). */
export const LOW_BATTERY_RULES = { low: 0.2, critical: 0.1 } as const;

export type LowBattery = { tier: 'low' | 'critical'; percent: number } | null;

/**
 * The battery when it threatens the ride: unplugged and at or below 20 % ("low") or 10 %
 * ("critical"). `null` while charging, when the level is unknown (simulator, web) or fine.
 */
export function useLowBattery(): LowBattery {
  const level = useBatteryLevel();
  const state = useBatteryState();
  const charging = state === BatteryState.CHARGING || state === BatteryState.FULL;
  if (charging || level < 0 || level > LOW_BATTERY_RULES.low) {
    return null;
  }
  return {
    tier: level <= LOW_BATTERY_RULES.critical ? 'critical' : 'low',
    percent: Math.round(level * 100),
  };
}
