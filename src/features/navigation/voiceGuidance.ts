import * as Speech from 'expo-speech';

import { i18n } from '@/i18n';

/** Announcement distances before a maneuver: early heads-up and the final call. */
export const VOICE_THRESHOLDS_M = [400, 100] as const;

/** Speaks a guidance line in the app language, cutting off anything still being read. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: i18n.language === 'tr' ? 'tr-TR' : 'en-GB', rate: 1.0 });
}

export function stopSpeaking() {
  Speech.stop();
}
