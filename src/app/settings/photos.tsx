import { MediaImage } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';

import { PermissionSheet } from '@/components/settings/PermissionSheet';
import { usePermissionStatuses } from '@/features/settings/permissionStatus';

/** 10.08 Fotoğraf izni (Pencil `j4Q5D`): the current access and a link to the phone settings. */
export default function PhotoPermissionSheet() {
  const { t } = useTranslation('settings');
  const status = usePermissionStatuses()?.photos ?? 'off';
  return (
    <PermissionSheet
      icon={MediaImage}
      title={t('permission.photos.title')}
      description={t(`permission.photos.${status}`)}
      value={
        status === 'limited' ? t('permission.photos.valueLimited') : t(`values.photos.${status}`)
      }
    />
  );
}
