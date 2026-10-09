import { useLocalSearchParams } from 'expo-router';

import { CommentsSheet } from '@/components/community/CommentsSheet';
import { firstParam } from '@/features/auth/credentials';
import { useRider, useRiderRides } from '@/features/riders/queries';

/** 13.02 Topluluk / Yorumlar for one of a rider's rides (the profile's ride cards open it). */
export default function RideCommentsSheet() {
  const params = useLocalSearchParams<{ id?: string | string[]; rideId?: string | string[] }>();
  const riderId = firstParam(params.id);
  const rideId = firstParam(params.rideId);
  const { data: rider } = useRider(riderId);
  const { data: rides } = useRiderRides(riderId);
  const ride = rides?.find((item) => item.id === rideId);

  return (
    <CommentsSheet
      target={rideId ? { type: 'ride', id: rideId } : undefined}
      subject={{
        count: ride?.commentCount,
        title: ride?.title || rider?.name,
        ownerId: riderId,
      }}
    />
  );
}
