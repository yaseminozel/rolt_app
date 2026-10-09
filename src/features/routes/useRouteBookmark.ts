import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/feedback/ToastProvider';
import { useRequireAccount } from '@/features/auth/useRequireAccount';

import { useSavedRoutes } from './SavedRoutesProvider';

type ToggleOptions = {
  /** Toast distance above the bottom safe area, clearing the screen's own bottom UI. */
  toastBottomOffset?: number;
};

/**
 * Bookmark toggle shared by route cards and the route detail (CLAUDE.md "Kaydetme"):
 * guests get the sign-in prompt and the save completes after sign-in; saving shows
 * "Rota kaydedildi · Görüntüle", removing shows "… çıkarıldı · Geri al". The change shows at
 * once; if it can't be stored it is rolled back with a failure toast.
 */
export function useRouteBookmark() {
  const { t } = useTranslation('routes');
  const requireAccount = useRequireAccount();
  const { isSaved, setSaved } = useSavedRoutes();
  const { showToast } = useToast();

  const toggleBookmark = useCallback(
    (routeId: string, { toastBottomOffset }: ToggleOptions = {}) => {
      const store = (save: boolean) =>
        setSaved(routeId, save).then((stored) => {
          if (!stored) {
            showToast({
              variant: 'failure',
              message: save ? t('saved.saveFailed') : t('saved.removeFailed'),
              bottomOffset: toastBottomOffset,
            });
          }
        });

      requireAccount('saveRoute', () => {
        // A guest's replayed action always saves (they tapped an empty bookmark).
        const save = !isSaved(routeId);
        void store(save);
        showToast(
          save
            ? {
                variant: 'saved',
                message: t('saved.saved'),
                actionLabel: t('saved.view'),
                // "Kaydettiklerim" lives in Profile.
                onActionPress: () => router.navigate('/profile'),
                bottomOffset: toastBottomOffset,
              }
            : {
                variant: 'removed',
                message: t('saved.removed'),
                actionLabel: t('saved.undo'),
                onActionPress: () => void store(true),
                bottomOffset: toastBottomOffset,
              },
        );
      });
    },
    [isSaved, requireAccount, setSaved, showToast, t],
  );

  return { isSaved, toggleBookmark };
}
