import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { motorcycleBrandNames, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { SheetHeader } from '@/components/feedback/SheetHeader';
import { OptionRow } from '@/components/registration/OptionRow';
import { OptionSheetList } from '@/components/registration/OptionSheetList';
import { BrandRow } from '@/components/settings/BrandRow';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { modelsForBrand } from '@/features/garage/fixtures/motorcycleModels';
import { garageResult } from '@/features/garage/garageFlow';
import type { MotorcycleModel } from '@/features/garage/types';
import { useUpdateOwnProfile } from '@/features/profile/queries';
import { modelYears, REGISTRATION_BRANDS } from '@/features/registration/garageOptions';
import { formatNumber } from '@/i18n/format';
import { matchesSearch } from '@/lib/searchText';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';
import { colors, layout, spacing } from '@/theme';

type Step = 'brand' | 'model' | 'year' | 'summary';

/**
 * 11.02 Marka seç → 11.03 Model seç → 11.04 Yıl seç → 11.05 Özet (Figma `1005:38399`,
 * `1005:38454`, `1005:38502`, `1005:38354`): one sheet stepping through the bike, "Geri" going
 * one step back. "Kaydet" makes it the profile's bike and closes the sheet.
 */
export default function GarageAddSheet() {
  const { t, i18n } = useTranslation(['settings', 'registration']);
  const { mode } = useLocalSearchParams<{ mode?: 'add' | 'change' }>();
  const update = useUpdateOwnProfile();
  const bottomPadding = useSheetBottomPadding((inset) => inset + spacing.lg);
  const [years] = useState(() => modelYears());
  const [step, setStep] = useState<Step>('brand');
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState<MotorcycleBrand | null>(null);
  const [model, setModel] = useState<MotorcycleModel | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const go = (next: Step) => {
    setQuery('');
    setStep(next);
  };
  const close = () => router.back();

  const brands = useMemo(
    () => REGISTRATION_BRANDS.filter((item) => matchesSearch(motorcycleBrandNames[item], query)),
    [query],
  );
  const models = useMemo(
    () => (brand ? modelsForBrand(brand).filter((item) => matchesSearch(item.name, query)) : []),
    [brand, query],
  );

  const save = async () => {
    if (!brand || !model) {
      return;
    }
    await update.mutateAsync({ bike: { brand, model: model.name, year: year ?? undefined } });
    garageResult.set(mode === 'change' ? 'changed' : 'added');
    router.back();
  };

  if (step === 'brand') {
    return (
      <OptionSheetList
        title={t('registration:bike.brand')}
        onClose={close}
        search={{ value: query, onChangeText: setQuery, placeholder: t('registration:bike.brandSearch') }}
        data={brands}
        keyExtractor={(item) => item}
        renderItem={(item) => (
          <BrandRow
            brand={item}
            label={motorcycleBrandNames[item]}
            onPress={() => {
              if (item !== brand) {
                setModel(null);
                setYear(null);
              }
              setBrand(item);
              go('model');
            }}
          />
        )}
      />
    );
  }

  if (step === 'model' && brand) {
    return (
      <OptionSheetList
        title={t('registration:bike.model')}
        onBack={() => go('brand')}
        onClose={close}
        search={{ value: query, onChangeText: setQuery, placeholder: t('registration:bike.modelSearch') }}
        sectionTitle={t('registration:bike.modelsOf', {
          brand: motorcycleBrandNames[brand],
        }).toLocaleUpperCase(i18n.language)}
        data={models}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <OptionRow
            label={item.name}
            value={t('registration:bike.displacement', { cc: formatNumber(item.displacementCc) })}
            onPress={() => {
              if (item.id !== model?.id) {
                setYear(null);
              }
              setModel(item);
              go('year');
            }}
          />
        )}
      />
    );
  }

  if (step === 'year' && brand && model) {
    return (
      <OptionSheetList
        title={t('garage.productionYear')}
        onBack={() => go('model')}
        onClose={close}
        sectionTitle={`${motorcycleBrandNames[brand]} ${model.name}`.toLocaleUpperCase(i18n.language)}
        data={years}
        keyExtractor={String}
        renderItem={(item) => (
          <OptionRow
            label={String(item)}
            onPress={() => {
              setYear(item);
              go('summary');
            }}
          />
        )}
      />
    );
  }

  if (!brand || !model) {
    return null;
  }

  return (
    <View style={[styles.summary, { paddingBottom: bottomPadding }]}>
      <SheetHeader
        title={t('garage.confirm.title')}
        subtitle={t('garage.confirm.subtitle')}
        onBack={() => go('year')}
      />
      <View style={styles.summaryBody}>
        <SettingsSection inset>
          {[
            <SettingsRow
              key="brand"
              label={t('garage.brand')}
              trailing="value"
              value={motorcycleBrandNames[brand]}
            />,
            <SettingsRow
              key="model"
              label={t('garage.model')}
              trailing="value"
              value={t('garage.modelWithCc', {
                model: model.name,
                cc: formatNumber(model.displacementCc),
              })}
            />,
            <SettingsRow
              key="year"
              label={t('garage.year')}
              trailing="value"
              value={year ? String(year) : '–'}
            />,
          ]}
        </SettingsSection>
        <Button size="lg" label={t('garage.save')} loading={update.isPending} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.surface,
  },
  summaryBody: {
    gap: spacing.xxl,
    paddingTop: spacing.xs,
    paddingHorizontal: layout.screenGutter,
  },
});
