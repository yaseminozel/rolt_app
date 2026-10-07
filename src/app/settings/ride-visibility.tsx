import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Globe, Group, InfoCircle, Lock } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InfoNote } from '@/components/feedback/InfoNote';
import { ChoiceSheet } from '@/components/settings/ChoiceSheet';
import { rideKeys, useDefaultRideVisibility } from '@/features/rides/queries';
import { ridesRepository } from '@/features/rides/ridesRepository';
import { RIDE_VISIBILITIES, type RideVisibility } from '@/features/rides/types';

const ICONS = { public: Globe, followers: Group, private: Lock } as const;

/**
 * 10.04 Sürüş görünürlüğü (Pencil `ZcJPf`): the default for new rides. The design draws two
 * options; the save form offers three (08.08), so the same three are offered here. The value is
 * the one the save form starts with, and saving a ride with another choice updates it too.
 */
export default function RideVisibilitySheet() {
  const { t } = useTranslation(['settings', 'rides']);
  const queryClient = useQueryClient();
  const { data: current = 'private' } = useDefaultRideVisibility();
  const [choice, setChoice] = useState<RideVisibility | null>(null);
  const [saving, setSaving] = useState(false);
  const value = choice ?? current;

  const save = async () => {
    setSaving(true);
    try {
      await ridesRepository.setDefaultVisibility(value);
      await queryClient.invalidateQueries({ queryKey: rideKeys.defaultVisibility() });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ChoiceSheet
      title={t('rideVisibility.title')}
      subtitle={t('rideVisibility.subtitle')}
      options={RIDE_VISIBILITIES.map((option) => ({
        value: option,
        label: t(`values.visibility.${option}`),
        description: t(`rides:visibility.descriptions.${option}`),
        icon: ICONS[option],
      }))}
      value={value}
      onChange={setChoice}
      note={<InfoNote text={t('rideVisibility.note')} icon={InfoCircle} />}
      saveLabel={t('rideVisibility.save')}
      onSave={save}
      saving={saving}
    />
  );
}
