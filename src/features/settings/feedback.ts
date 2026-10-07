import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** "Konu" of "Geri bildirim gönder" (10.13). */
export type FeedbackTopic = 'bug' | 'idea' | 'route' | 'other';
export const FEEDBACK_TOPICS: readonly FeedbackTopic[] = ['bug', 'idea', 'route', 'other'];

export type FeedbackInput = {
  topic: FeedbackTopic;
  message: string;
  screenshotUris: string[];
};

/** Attached to every message ("Uygulama sürümü, cihaz modeli … otomatik eklenir"). */
export function feedbackContext() {
  return {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    device: Constants.deviceName ?? 'unknown',
  };
}

const NETWORK_DELAY_MS = 800;

/** MOCK until the backend: waits like a request and succeeds. */
export async function sendFeedback(input: FeedbackInput) {
  const payload = { ...input, context: feedbackContext() };
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
  return payload;
}
