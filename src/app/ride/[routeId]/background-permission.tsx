import { router, useLocalSearchParams } from 'expo-router';

import { BackgroundPermissionContent } from '@/components/navigation/BackgroundPermissionContent';

/** 06.04 before navigation: either answer continues to the countdown (06.05). */
export default function BackgroundPermissionSheet() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  return (
    <BackgroundPermissionContent
      onDone={() => {
        router.back();
        router.push({ pathname: '/ride/[routeId]/countdown', params: { routeId } });
      }}
    />
  );
}
