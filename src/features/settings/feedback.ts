import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { currentUserId, hasSupabase, supabase } from '@/lib/supabase/client';
import { contentTypeOf, newObjectPath, removeFiles, uploadFile } from '@/lib/supabase/storage';

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

/**
 * Sends a message to `public.feedback`. Signed-in riders' screenshots go to the private `feedback`
 * bucket first (their own folder); guests can't upload, so their message goes as text only.
 * Without Supabase (MOCK) it waits like a request and succeeds.
 */
export async function sendFeedback(input: FeedbackInput) {
  const context = feedbackContext();
  if (!hasSupabase) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    return;
  }
  const userId = await currentUserId();
  const uploads = userId
    ? await Promise.allSettled(
        input.screenshotUris.map((uri) =>
          uploadFile('feedback', newObjectPath(userId, contentTypeOf(uri)), uri),
        ),
      )
    : [];
  const paths = uploads.flatMap((upload) => (upload.status === 'fulfilled' ? [upload.value] : []));
  if (paths.length < uploads.length) {
    removeFiles('feedback', paths).catch(() => undefined);
    throw new Error('Screenshot upload failed');
  }
  // No `.select()`: the row isn't readable back (guests and riders may only insert).
  const { error } = await supabase.from('feedback').insert({
    topic: input.topic,
    message: input.message,
    context,
    screenshot_paths: paths,
  });
  if (error) {
    removeFiles('feedback', paths).catch(() => undefined);
    throw error;
  }
}
