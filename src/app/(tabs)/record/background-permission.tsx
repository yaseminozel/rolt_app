import { router } from 'expo-router';

import { BackgroundPermissionContent } from '@/components/navigation/BackgroundPermissionContent';

/**
 * 06.04 before the first free recording: either answer returns to Record, which then starts
 * (the start intent is kept, flow B).
 */
export default function RecordBackgroundPermissionSheet() {
  return <BackgroundPermissionContent onDone={() => router.back()} />;
}
