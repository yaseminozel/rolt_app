import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * App-wide touch feedback (CLAUDE.md "Dokunsal geri bildirim"). Screens and components call
 * these verbs, never `expo-haptics` directly, so one event feels the same everywhere:
 * - `select`: a choice changed (switch, chip, segment, radio, checkbox, detent tick).
 * - `tap`: a small confirmation (bookmark, like, follow, countdown second, sheet snap).
 * - `press`: a primary control or "turned green" (pause, resume, finish, GPS ready, drag lift).
 * - `thud`: the ride really starts (recording, navigation).
 * - `success` / `warning` / `error`: outcomes (saved, too short / tilted, failed).
 * The system already honours the user's vibration setting and Low Power Mode; web is silent.
 */

/** Two feedbacks closer than this are one (e.g. a row and the toast it raises). */
const MIN_GAP_MS = 50;

let lastAt = 0;
const ignore = () => {};

function play(effect: () => Promise<void>) {
  if (Platform.OS === 'web') {
    return;
  }
  const now = Date.now();
  if (now - lastAt < MIN_GAP_MS) {
    return;
  }
  lastAt = now;
  effect().catch(ignore);
}

export const haptics = {
  select: () => play(Haptics.selectionAsync),
  tap: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  thud: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticEffect = keyof typeof haptics;
