import { router } from 'expo-router';
import { Globe, GraphUp, PathArrow } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { RideTypeIcon } from '@/components/ride/icons/RideTypeIcon';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { RIDE_NOTES_MAX, RIDE_PHOTOS_MAX } from '@/features/rides/rideForm';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { rideTypeLabelKey } from '@/features/rides/rideTypes';
import { colors, radius, spacing, typography } from '@/theme';

import { RidePhotosField } from './RidePhotosField';
import { RideSummaryCard } from './RideSummaryCard';
import { SelectField } from './SelectField';

type RideDetailsFormProps = {
  /** Saving in progress: the form is dimmed and locked (08.05 "Kaydediliyor", 48 %). */
  locked?: boolean;
  onDelete: () => void;
};

/**
 * Body of "Sürüşü kaydet" (08.05 `VdbQJ`) and "Sürüşü düzenle" (09.07 `ovj5p`): summary card,
 * name, ride details, notes, photos, visibility, ride type and "Sürüşü sil". Every field is
 * optional (flow C); the pickers are sheets that write into `RideFormProvider`.
 */
export function RideDetailsForm({ locked = false, onDelete }: RideDetailsFormProps) {
  const { t } = useTranslation(['rides', 'routes']);
  const { ride, values, setValue, retryPhoto, removePhoto } = useRideForm();
  const open = (sheet: 'ride-type' | 'visibility' | 'photo-source' | 'difficulty' | 'surface') =>
    router.push({ pathname: `/rides/[rideId]/${sheet}`, params: { rideId: ride.id } });

  return (
    <View
      style={[styles.form, locked && styles.locked]}
      pointerEvents={locked ? 'none' : 'auto'}
      accessibilityState={{ disabled: locked }}>
      <RideSummaryCard ride={ride} />

      <TextField
        label={t('form.name.label')}
        value={values.title}
        onChangeText={(title) => setValue('title', title)}
        placeholder={t('form.name.placeholder')}
        returnKeyType="done"
        maxLength={80}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('form.details.label')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={GraphUp}
            label={t('form.details.difficulty')}
            trailing="valueChevron"
            value={t(`routes:difficulty.${values.difficulty}`)}
            onPress={() => open('difficulty')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={PathArrow}
            label={t('form.details.surface')}
            trailing="valueChevron"
            value={t(`routes:surface.${values.surface}`)}
            onPress={() => open('surface')}
          />
        </View>
      </View>

      <TextField
        type="multiline"
        label={t('form.notes.label')}
        value={values.notes}
        onChangeText={(notes) => setValue('notes', notes)}
        placeholder={t('form.notes.placeholder')}
        maxLength={RIDE_NOTES_MAX}
      />

      <RidePhotosField
        photos={values.photos}
        max={RIDE_PHOTOS_MAX}
        onAdd={() => open('photo-source')}
        onRetry={retryPhoto}
        onRemove={removePhoto}
        disabled={locked}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('form.visibility.label')}</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={Globe}
            label={t('form.visibility.row')}
            trailing="valueChevron"
            value={t(`visibility.${values.visibility}`)}
            onPress={() => open('visibility')}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.sectionLabel}>{t('form.rideType.label')}</Text>
        <SelectField
          value={t(rideTypeLabelKey(values.rideType))}
          leading={
            <RideTypeIcon
              type={values.rideType}
              size={20}
              color={colors.textPrimary}
              strokeWidth={1.5}
            />
          }
          accessibilityLabel={t('form.rideType.label')}
          onPress={() => open('ride-type')}
        />
      </View>

      <Button
        variant="text"
        destructive
        label={t('form.delete')}
        onPress={onDelete}
        style={styles.delete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  locked: {
    opacity: 0.48,
  },
  section: {
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  delete: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
});
