import * as Notifications from 'expo-notifications';
import { CheckCircle, Group, PathArrow } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HandIcon } from '@/components/permissions/icons/HandIcon';
import { SunriseIcon } from '@/components/permissions/icons/SunriseIcon';
import {
  NotificationPreviewStack,
  type NotificationPreview,
} from '@/components/permissions/NotificationPreviewStack';
import { PermissionScreen, type PermissionBenefit } from '@/components/permissions/PermissionScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

/**
 * 00.14 İzin / Bildirimler (Pencil `RzQd4`), the last step after registration.
 * "Bildirimlere izin ver" shows the system prompt (alert, badge, sound); whatever the
 * answer — like "Şimdi değil" — it finishes the permission prompts and the root guard
 * opens the app.
 */
export default function NotificationPermissionScreen() {
  const { t } = useTranslation('permissions');
  const { finishPermissionPrompts } = useAuth();
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // A failed request is treated like "not now"; settings can enable notifications later.
    }
    finishPermissionPrompts();
  };

  const previews: NotificationPreview[] = [
    {
      key: 'rideInvite',
      icon: HandIcon,
      iconBackground: colors.brand,
      title: t('notifications.preview.rideInvite.title'),
      time: t('notifications.preview.rideInvite.time'),
      text: t('notifications.preview.rideInvite.text'),
      opacity: 1,
    },
    {
      key: 'routePublished',
      icon: PathArrow,
      iconBackground: colors.surfaceInverse,
      title: t('notifications.preview.routePublished.title'),
      time: t('notifications.preview.routePublished.time'),
      text: t('notifications.preview.routePublished.text'),
      opacity: 0.75,
    },
    {
      key: 'dailyMatches',
      icon: Group,
      iconBackground: colors.noteAccentText,
      title: t('notifications.preview.dailyMatches.title'),
      time: t('notifications.preview.dailyMatches.time'),
      text: t('notifications.preview.dailyMatches.text'),
      opacity: 0.45,
    },
  ];

  const benefits: PermissionBenefit[] = [
    {
      key: 'rideInvites',
      icon: Group,
      title: t('notifications.benefits.rideInvites.title'),
      text: t('notifications.benefits.rideInvites.text'),
    },
    {
      key: 'routeApprovals',
      icon: CheckCircle,
      title: t('notifications.benefits.routeApprovals.title'),
      text: t('notifications.benefits.routeApprovals.text'),
    },
    {
      key: 'dailyMatches',
      icon: SunriseIcon,
      title: t('notifications.benefits.dailyMatches.title'),
      text: t('notifications.benefits.dailyMatches.text'),
    },
  ];

  return (
    <PermissionScreen
      illustration={<NotificationPreviewStack notifications={previews} />}
      title={t('notifications.title')}
      description={t('notifications.description')}
      benefits={benefits}
      primaryLabel={t('notifications.allow')}
      onPrimaryPress={handleAllow}
      secondaryLabel={t('notNow')}
      onSecondaryPress={finishPermissionPrompts}
      busy={requesting}
    />
  );
}
