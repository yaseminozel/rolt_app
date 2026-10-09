import { useLocalSearchParams } from 'expo-router';

import { RideCommentsSheet } from '@/components/community/RideCommentsSheet';

/** 13.02 Topluluk / Yorumlar over a ride's detail (09.06). */
export default function RideDetailCommentsSheet() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  return <RideCommentsSheet rideId={rideId} />;
}
