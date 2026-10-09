import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/feedback/ToastProvider';
import { useRequireAccount } from '@/features/auth/useRequireAccount';
import { hapticToggle } from '@/features/haptics/haptics';

import { useSetRideLiked, useSetRideSaved } from './queries';

type RideState = { id: string; isLiked: boolean; isSaved: boolean };

/**
 * Like and bookmark of an uploaded ride, as profile ride cards, the ride detail and the saved
 * rides do them: account-only (`useRequireAccount`), optimistic, and a bookmark answers with the
 * "saved" toast or "removed" + "Geri al".
 */
export function useRideActions({ toastBottomOffset }: { toastBottomOffset?: number } = {}) {
  const { t } = useTranslation(['profile', 'common']);
  const requireAccount = useRequireAccount();
  const { showToast } = useToast();
  const setLiked = useSetRideLiked();
  const setSaved = useSetRideSaved();

  const toggleLike = (ride: RideState) => {
    const liked = !ride.isLiked;
    requireAccount('likeRide', () => {
      hapticToggle(liked);
      setLiked.mutate({ rideId: ride.id, liked });
    });
  };

  const toggleSave = (ride: RideState) => {
    const saved = !ride.isSaved;
    requireAccount('saveRide', () => {
      setSaved.mutate({ rideId: ride.id, saved });
      showToast(
        saved
          ? { variant: 'saved', message: t('activity.saved'), bottomOffset: toastBottomOffset }
          : {
              variant: 'removed',
              message: t('activity.removed'),
              actionLabel: t('common:actions.undo'),
              onActionPress: () => setSaved.mutate({ rideId: ride.id, saved: true }),
              bottomOffset: toastBottomOffset,
            },
      );
    });
  };

  return { toggleLike, toggleSave };
}
