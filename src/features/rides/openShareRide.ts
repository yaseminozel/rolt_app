import { router } from 'expo-router';

/** Opens "Sürüşü paylaş" (09.03) for a recorded ride or one of the sample account's rides. */
export function openShareRide(rideId: string, sample?: { riderId: string }) {
  router.push({
    pathname: '/share-ride',
    params: sample
      ? { rideId, source: 'sample', riderId: sample.riderId }
      : { rideId, source: 'device' },
  });
}
