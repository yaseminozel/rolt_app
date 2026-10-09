import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstParam } from '@/features/auth/credentials';

/**
 * Ride share link opened as a universal link (https://roltapp.com/r/<id>): the ride detail
 * (09.06), which loads rides that aren't on this device from the server.
 */
export default function RideLinkScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  return <Redirect href={{ pathname: '/rides/[rideId]', params: { rideId: firstParam(params.id) } }} />;
}
