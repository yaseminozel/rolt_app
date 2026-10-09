import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { LiveActivity, LiveActivityFactory } from 'expo-widgets';
import { Platform } from 'react-native';

import type { RideActivityProps } from './rideActivityTypes';

/**
 * The ride's Live Activity (Lock Screen, Dynamic Island) for the record and navigation sessions,
 * which never run at the same time. `expo-widgets` is iOS-only and missing from Expo Go, so it
 * is required lazily here and every call is a no-op where it can't run (Android, web, Expo Go,
 * Live Activities switched off in Settings).
 */
const supported =
  Platform.OS === 'ios' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Between state changes the Lock Screen is refreshed this often; the clock runs by itself. A
 * free ride only moves distance and speed; navigation counts down to the next maneuver.
 */
export const LIVE_ACTIVITY_INTERVAL_MS = { recording: 10_000, navigation: 4_000 } as const;

let factory: LiveActivityFactory<RideActivityProps> | null | undefined;
let current: LiveActivity<RideActivityProps> | null = null;
let lastKey = '';
let lastSentAt = 0;

function getFactory() {
  if (factory === undefined) {
    factory = null;
    if (supported) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: not in Expo Go
        factory = require('./RideActivity').default as LiveActivityFactory<RideActivityProps>;
      } catch {
        factory = null;
      }
    }
  }
  return factory;
}

/**
 * Changes that must reach the Lock Screen at once rather than on the next refresh. The maneuver
 * line itself carries a shrinking distance, so a new maneuver shows through its road / stop.
 */
const stateKey = (props: RideActivityProps) =>
  [props.status, props.timerRunning, props.instructionDetail, props.title].join('|');

const ignore = () => {};

export const rideLiveActivity = {
  /**
   * Shows or refreshes the activity; cheap to call on every snapshot (throttled here). `url` is
   * opened when the activity is tapped; without it the app comes back where it was.
   */
  show(props: RideActivityProps, intervalMs: number, url?: string) {
    const activities = getFactory();
    if (!activities) {
      return;
    }
    const now = Date.now();
    try {
      if (!current) {
        current = activities.start(props, url);
      } else {
        const key = stateKey(props);
        if (key === lastKey && now - lastSentAt < intervalMs) {
          return;
        }
        current.update(props).catch(ignore);
      }
      lastKey = stateKey(props);
      lastSentAt = now;
    } catch {
      // Live Activities turned off for ROLT, or the system refused one: the ride goes on.
      current = null;
    }
  },

  /** Removes the activity at once (the ride was saved, cancelled or left). */
  end() {
    current?.end('immediate').catch(ignore);
    current = null;
    lastKey = '';
  },

  /**
   * An activity outlives a killed app; on launch nothing is running yet, so any left over is
   * stale (an interrupted ride shows as 08.03 in the app instead).
   */
  endStale() {
    const activities = getFactory();
    if (!activities || current) {
      return;
    }
    try {
      for (const activity of activities.getInstances()) {
        activity.end('immediate').catch(ignore);
      }
    } catch {
      // Nothing to clean up.
    }
  },
};
