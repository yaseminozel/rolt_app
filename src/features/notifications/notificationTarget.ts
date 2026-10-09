import { router } from 'expo-router';
import { Linking } from 'react-native';


import type { AppNotification, NotificationKind } from './types';

/** What a tap needs to know: the list row, or the `data` of a push (`pushData`). */
export type NotificationTarget = Pick<
  AppNotification,
  'kind' | 'routeId' | 'postId' | 'rideId' | 'actorId' | 'conversationId'
> & {
  /** Product updates may carry a link (push only): an app path or a web page. */
  url?: string;
};

/** The own ride when it is on this device (09.06), otherwise the own profile and its rides. */
/** The ride detail (09.06) opens from the device or, for a ride not on it, from the server. */
function openOwnRide(rideId: string) {
  router.push({ pathname: '/rides/[rideId]', params: { rideId } });
}

function openUrl(url: string) {
  if (/^https?:\/\//.test(url)) {
    Linking.openURL(url).catch(() => undefined);
  } else if (url.startsWith('/')) {
    router.navigate(url as Parameters<typeof router.navigate>[0]);
  }
}

/**
 * Where a notification leads (not drawn; one mapping for the list 12.01 and for push taps):
 * - comment / like: on a post → that post's comments (13.02); on a ride → the ride, or Profile
 * - follower / followRequest → that rider's profile
 * - routeSuggestion → the route when there is one new route, otherwise Discover
 * - suggestionApproved → the published route
 * - message: no chat screen yet, so a tap only marks it read
 * - productUpdate → its link if the push carries one
 * Routes inside the tabs are `navigate`d (switching tab); root stack screens are pushed.
 */
export async function openNotificationTarget(target: NotificationTarget) {
  switch (target.kind) {
    case 'comment':
    case 'like':
      if (target.postId) {
        router.navigate({ pathname: '/community/comments', params: { postId: target.postId } });
      } else if (target.rideId) {
        openOwnRide(target.rideId);
      } else {
        router.navigate('/profile');
      }
      return;
    case 'follower':
    case 'followRequest':
      if (target.actorId) {
        router.push({ pathname: '/rider/[id]', params: { id: target.actorId } });
      } else {
        router.navigate('/profile');
      }
      return;
    case 'routeSuggestion':
      if (target.routeId) {
        router.push({ pathname: '/route/[id]', params: { id: target.routeId } });
      } else {
        router.navigate('/discover');
      }
      return;
    case 'suggestionApproved':
      if (target.routeId) {
        router.push({ pathname: '/route/[id]', params: { id: target.routeId } });
      }
      return;
    case 'productUpdate':
      if (target.url) {
        openUrl(target.url);
      }
      return;
    case 'message':
      return;
  }
}

const KINDS: readonly NotificationKind[] = [
  'comment',
  'like',
  'routeSuggestion',
  'follower',
  'suggestionApproved',
  'followRequest',
  'message',
  'productUpdate',
];

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * The `data` of a ROLT push (written by the `push` edge function):
 * `{ notificationId, kind, routeId?, postId?, rideId?, actorId?, conversationId?, url? }`.
 * Null for anything else (e.g. a push sent from the Expo tool without data).
 */
export function pushData(
  data: Record<string, unknown> | null | undefined,
): (NotificationTarget & { notificationId?: string }) | null {
  const kind = data?.kind;
  if (!KINDS.includes(kind as NotificationKind)) {
    return null;
  }
  return {
    notificationId: text(data?.notificationId),
    kind: kind as NotificationKind,
    routeId: text(data?.routeId),
    postId: text(data?.postId),
    rideId: text(data?.rideId),
    actorId: text(data?.actorId),
    conversationId: text(data?.conversationId),
    url: text(data?.url),
  };
}
