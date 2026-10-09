import * as Clipboard from 'expo-clipboard';
import { Linking, Share } from 'react-native';

import { formatDistance, formatRideClock } from '@/i18n/format';
import { i18n } from '@/i18n';

import { rideTitle } from './rideTitle';
import type { RideRecord } from './types';

/**
 * "Hemen paylaş" targets (08.11). `community` ("Toplulukta paylaş") opens the Topluluk composer
 * with the ride (`shareRideToCommunity`) and isn't handled by `shareRide`.
 */
export type ShareTarget =
  | 'community'
  | 'instagramStory'
  | 'instagramPost'
  | 'whatsapp'
  | 'copyLink'
  | 'other';

/** Share link of a ride: roltapp.com/r/<id> opens the app (rolt://rides/<id>) or the site. */
export const rideLink = (rideId: string) => `https://roltapp.com/r/${rideId}`;

export function rideShareMessage(ride: RideRecord) {
  return i18n.t('rides:share.message', {
    title: rideTitle(ride),
    distance: formatDistance(ride.stats.distanceM / 1000, 1),
    duration: formatRideClock(ride.stats.durationS),
    link: rideLink(ride.id),
  });
}

/**
 * Shares a ride as text and link. WhatsApp opens with the message; Instagram takes no text from
 * other apps, so both Instagram targets and "Diğer" open the system share sheet (where Instagram
 * is listed). The share image ("Paylaşım görseli oluştur") comes with the share templates.
 * Resolves to `copied` when the link went to the clipboard.
 */
export async function shareRide(
  ride: RideRecord,
  target: ShareTarget,
): Promise<'copied' | 'shared'> {
  const message = rideShareMessage(ride);
  if (target === 'copyLink') {
    await Clipboard.setStringAsync(rideLink(ride.id));
    return 'copied';
  }
  if (target === 'whatsapp') {
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
      return 'shared';
    } catch {
      // WhatsApp isn't installed: fall back to the share sheet.
    }
  }
  await Share.share({ message });
  return 'shared';
}
