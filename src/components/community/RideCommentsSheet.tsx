import { useOwnRiderId } from '@/features/riders/ownRider';
import { useRideDetail } from '@/features/riders/queries';
import { useRideRecord } from '@/features/rides/queries';
import { rideTitle } from '@/features/rides/rideTitle';

import { CommentsSheet } from './CommentsSheet';

/**
 * 13.02 Topluluk / Yorumlar for one uploaded ride, by id: the ride detail (09.06) and the own
 * profile's ride cards open it. The header's count and title come from the server's copy (kept
 * current by the comment mutations), the title from the device when the ride is the viewer's.
 */
export function RideCommentsSheet({ rideId }: { rideId: string | undefined }) {
  const { data: local } = useRideRecord(rideId);
  const { data: ride } = useRideDetail(rideId);
  const ownRiderId = useOwnRiderId();

  return (
    <CommentsSheet
      target={rideId ? { type: 'ride', id: rideId } : undefined}
      subject={{
        count: ride?.commentCount,
        title: local ? rideTitle(local) : ride?.title,
        ownerId: ride?.author.id ?? (local ? ownRiderId : undefined),
      }}
    />
  );
}
