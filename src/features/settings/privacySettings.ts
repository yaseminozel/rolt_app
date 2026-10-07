import { useQuery } from '@tanstack/react-query';

import { deviceStore } from '@/lib/deviceStore';

/** "Başlangıç/bitiş noktası" (10.05): hide the first and last part of every ride on maps. */
export type EndpointPrivacy = { hidden: boolean; distanceM: 100 | 250 | 500 | 1000 };

const KEY = 'rolt.settings.endpointPrivacy';
/** Hidden by default, as the settings menu shows it ("Gizli"); the distance is set on 10.05. */
export const DEFAULT_ENDPOINT_PRIVACY: EndpointPrivacy = { hidden: true, distanceM: 250 };

export async function readEndpointPrivacy(): Promise<EndpointPrivacy> {
  const raw = await deviceStore.get(KEY);
  return raw
    ? { ...DEFAULT_ENDPOINT_PRIVACY, ...(JSON.parse(raw) as Partial<EndpointPrivacy>) }
    : DEFAULT_ENDPOINT_PRIVACY;
}

export async function writeEndpointPrivacy(value: EndpointPrivacy) {
  await deviceStore.set(KEY, JSON.stringify(value));
}

export const settingsKeys = {
  endpointPrivacy: ['settings', 'endpointPrivacy'] as const,
};

export function useEndpointPrivacy() {
  return useQuery({ queryKey: settingsKeys.endpointPrivacy, queryFn: readEndpointPrivacy });
}
