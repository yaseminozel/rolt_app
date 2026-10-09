import { Redirect, useLocalSearchParams } from 'expo-router';

import { firstParam } from '@/features/auth/credentials';

/**
 * Route page link opened as a universal link (https://roltapp.com/rota/<id>, the website's route
 * page): the route detail (05.04).
 */
export default function RouteLinkScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  return <Redirect href={{ pathname: '/route/[id]', params: { id: firstParam(params.id) } }} />;
}
