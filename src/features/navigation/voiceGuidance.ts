import * as Speech from 'expo-speech';

import { i18n } from '@/i18n';

/** Announcement distances before a maneuver: early heads-up and the final call. */
export const VOICE_THRESHOLDS_M = [400, 100] as const;

/**
 * Speaks a guidance line in the app language, cutting off anything still being read. On iOS the
 * speech gets its own audio session (`useApplicationAudioSession: false`), so it plays with the
 * screen locked (`UIBackgroundModes: audio` in app.json), ducks the rider's music or intercom
 * instead of stopping it, and lets it come back up afterwards.
 */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, {
    language: i18n.language === 'tr' ? 'tr-TR' : 'en-GB',
    rate: 1.0,
    useApplicationAudioSession: false,
  });
}

export function stopSpeaking() {
  Speech.stop();
}
