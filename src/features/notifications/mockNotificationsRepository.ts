import { i18n } from '@/i18n';

import type { AppNotification, NotificationsRepository } from './types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NETWORK_DELAY_MS = 300;
const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

/** MOCK: the design's list (12.01 `k2k0EC`), with times relative to the app start. */
function fixtures(now: number): AppNotification[] {
  type MockKey = 'comment' | 'like' | 'routeSuggestion' | 'follower' | 'suggestionApproved';
  const t = (key: `${MockKey}.${'title' | 'body'}`) => i18n.t(`notifications:mock.${key}`);
  return [
    {
      id: 'n1',
      kind: 'comment',
      title: t('comment.title'),
      body: t('comment.body'),
      createdAt: new Date(now - 12 * MINUTE).toISOString(),
      read: false,
    },
    {
      id: 'n2',
      kind: 'like',
      title: t('like.title'),
      body: t('like.body'),
      createdAt: new Date(now - HOUR).toISOString(),
      read: false,
    },
    {
      id: 'n3',
      kind: 'routeSuggestion',
      title: t('routeSuggestion.title'),
      body: t('routeSuggestion.body'),
      createdAt: new Date(now - 3 * HOUR).toISOString(),
      read: false,
    },
    {
      id: 'n4',
      kind: 'follower',
      title: t('follower.title'),
      body: t('follower.body'),
      createdAt: new Date(now - 2 * DAY).toISOString(),
      read: true,
    },
    {
      id: 'n5',
      kind: 'suggestionApproved',
      title: t('suggestionApproved.title'),
      body: t('suggestionApproved.body'),
      createdAt: new Date(now - 4 * DAY).toISOString(),
      read: true,
      routeId: 'cirali',
    },
  ];
}

let items: AppNotification[] | null = null;
const current = () => (items ??= fixtures(Date.now()));

export const mockNotificationsRepository: NotificationsRepository = {
  async list() {
    await wait();
    return current().map((item) => ({ ...item }));
  },
  async markRead(id) {
    items = current().map((item) => (item.id === id ? { ...item, read: true } : item));
  },
  async markAllRead() {
    await wait();
    items = current().map((item) => ({ ...item, read: true }));
  },
};
