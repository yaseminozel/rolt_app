import { useLocalSearchParams } from 'expo-router';

import { RideCommentsSheet } from '@/components/community/RideCommentsSheet';

/** 13.02 Topluluk / Yorumlar for one of the viewer's uploaded rides, over the profile (09.01). */
export default function OwnRideCommentsSheet() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  return <RideCommentsSheet rideId={rideId} />;
}
