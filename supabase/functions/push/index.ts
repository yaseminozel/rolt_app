// Delivers one notification as an Expo push to every device of its recipient. Called by the
// database (private.dispatch_push → pg_net) with the shared secret; respects the rider's
// notification settings and removes tokens Expo reports as no longer registered.

import { env, isInternalCall, json, rpc, serviceFetch } from '../_shared/env.ts';

type PushPayload = {
  id: string;
  kind: string;
  title: string;
  body: string;
  routeId: string | null;
  postId: string | null;
  rideId: string | null;
  conversationId: string | null;
  actorId: string | null;
  unreadCount: number;
  enabled: boolean;
  tokens: string[];
};

type ExpoTicket = { status: 'ok' | 'error'; id?: string; message?: string; details?: { error?: string } };

/** Android channels created by the app (src/features/notifications/push.ts). */
const channelFor = (kind: string) =>
  ['like', 'comment', 'follower', 'followRequest', 'message'].includes(kind) ? 'social' : 'default';

Deno.serve(async (req) => {
  if (req.method !== 'POST' || !isInternalCall(req)) {
    return json({ error: 'forbidden' }, 403);
  }
  const { notificationId } = (await req.json()) as { notificationId?: string };
  if (!notificationId) {
    return json({ error: 'notificationId required' }, 400);
  }

  const payload = await rpc<PushPayload | null>('push_payload', { p_notification: notificationId });
  if (!payload || !payload.enabled || payload.tokens.length === 0) {
    return json({ sent: 0 });
  }

  const data = {
    notificationId: payload.id,
    kind: payload.kind,
    routeId: payload.routeId ?? undefined,
    postId: payload.postId ?? undefined,
    rideId: payload.rideId ?? undefined,
    actorId: payload.actorId ?? undefined,
    conversationId: payload.conversationId ?? undefined,
  };
  const messages = payload.tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data,
    sound: 'default',
    badge: payload.unreadCount,
    channelId: channelFor(payload.kind),
    priority: 'high',
    // Merged notifications (likes, messages) replace each other on the device.
    ...(payload.kind === 'like' || payload.kind === 'message' ? { threadId: payload.kind } : {}),
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    console.error('expo push failed', response.status, await response.text());
    return json({ error: 'expo push failed' }, 502);
  }
  const { data: tickets } = (await response.json()) as { data: ExpoTicket[] };

  const dead = tickets
    .map((ticket, index) => (ticket.details?.error === 'DeviceNotRegistered' ? payload.tokens[index] : null))
    .filter((token): token is string => token !== null);
  if (dead.length > 0) {
    const list = dead.map((token) => `"${token.replace(/"/g, '')}"`).join(',');
    await serviceFetch(`/rest/v1/push_tokens?token=in.(${encodeURIComponent(list)})`, { method: 'DELETE' });
  }
  await serviceFetch(`/rest/v1/notifications?id=eq.${payload.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ pushed_at: new Date().toISOString() }),
  });

  return json({ sent: tickets.filter((ticket) => ticket.status === 'ok').length, removed: dead.length });
});
