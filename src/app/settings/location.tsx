import { MapPin } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';

import { PermissionSheet } from '@/components/settings/PermissionSheet';
import { usePermissionStatuses } from '@/features/settings/permissionStatus';

/** 10.07 Konum izni (Pencil `ohq8P`): the current access and a link to the phone settings. */
export default function LocationPermissionSheet() {
  const { t } = useTranslation('settings');
  const status = usePermissionStatuses()?.location ?? 'off';
  return (
    <PermissionSheet
      icon={MapPin}
      title={t('permission.location.title')}
      description={t(`permission.location.${status}`)}
      value={t(`values.location.${status}`)}
    />
  );
}
