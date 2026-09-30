import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { ModelOptionRow } from '@/components/registration/ModelOptionRow';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { SelectedBrandSummary } from '@/components/registration/SelectedBrandSummary';
import { SearchField } from '@/components/ui/SearchField';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { TextField } from '@/components/ui/TextField';
import { modelsForBrand } from '@/features/garage/fixtures/motorcycleModels';
import {
  isValidModelYear,
  maxModelYear,
  MIN_MODEL_YEAR,
  recentModelYears,
} from '@/features/registration/garageOptions';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { formatNumber } from '@/i18n/format';
import { matchesSearch } from '@/lib/searchText';
import { colors, radius, spacing, typography } from '@/theme';

/** g4Zy4 stacks its blocks 16 pt apart (the other registration steps use 18). */
const CONTENT_GAP = spacing.lg;
const YEAR_LENGTH = 4;

type YearChoice = number | 'other' | undefined;

/**
 * 00.10 Kayıt / 3 · Model ve yıl (Pencil `g4Zy4`). No "Atla" in the design.
 * "Devam et" needs a model: a catalog row, or a typed name when the brand has no catalog
 * (manual brand) or the search finds nothing. The year is optional; "Diğer" reveals a
 * four-digit year field.
 */
export default function RegisterModelScreen() {
  const { t } = useTranslation(['registration', 'common', 'garage']);
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();

  const recentYears = useMemo(() => recentModelYears(), []);
  const catalog = useMemo(() => (draft.brand ? modelsForBrand(draft.brand) : []), [draft.brand]);
  const hasCatalog = catalog.length > 0;

  // A previously typed model for a catalog brand is restored as the search that found nothing.
  const [query, setQuery] = useState(hasCatalog ? (draft.customModelName ?? '') : '');
  const [selectedModelId, setSelectedModelId] = useState(draft.modelId);
  const [manualModel, setManualModel] = useState(draft.customModelName ?? '');
  const [yearChoice, setYearChoice] = useState<YearChoice>(() =>
    draft.modelYear === undefined ? undefined : recentYears.includes(draft.modelYear) ? draft.modelYear : 'other',
  );
  const [otherYear, setOtherYear] = useState(
    draft.modelYear !== undefined && !recentYears.includes(draft.modelYear) ? String(draft.modelYear) : '',
  );

  const brandName = draft.brand ? motorcycleBrandNames[draft.brand] : draft.customBrandName;
  const filteredModels = useMemo(
    () => catalog.filter((model) => matchesSearch(model.name, query)),
    [catalog, query],
  );

  if (!brandName) {
    return <Redirect href="/register/brand" />;
  }

  const showManualEntry = !hasCatalog || filteredModels.length === 0;
  const customModelName = showManualEntry ? manualModel.trim() : '';

  const parsedOtherYear = Number(otherYear);
  const otherYearValid = otherYear.length === YEAR_LENGTH && isValidModelYear(parsedOtherYear);
  const otherYearPending = yearChoice === 'other' && otherYear.length > 0 && !otherYearValid;
  const modelYear = typeof yearChoice === 'number' ? yearChoice : otherYearValid ? parsedOtherYear : undefined;

  const canContinue = (selectedModelId !== undefined || customModelName.length > 0) && !otherYearPending;

  const selectModel = (id: string) => {
    setSelectedModelId(id);
    setManualModel('');
  };

  const changeManualModel = (text: string) => {
    setManualModel(text);
    if (text.trim().length > 0) setSelectedModelId(undefined);
  };

  const changeBrand = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/register/brand');
  };

  const handleContinue = () => {
    if (!canContinue) return;
    updateDraft({
      modelId: selectedModelId,
      customModelName: selectedModelId ? undefined : customModelName,
      modelYear,
    });
    router.push('/register/riding-style');
  };

  const separator = t('listSeparator');

  return (
    <RegistrationStepScreen
      step={3}
      heading={t('model.heading')}
      description={t('model.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={handleContinue}
      ctaDisabled={!canContinue}
      contentGap={CONTENT_GAP}>
      <SelectedBrandSummary
        brand={draft.brand}
        brandName={brandName}
        label={t('model.brandLabel')}
        changeLabel={t('common:actions.change')}
        onChange={changeBrand}
      />

      {hasCatalog ? (
        <>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('model.searchPlaceholder', { brand: brandName })}
          />
          {filteredModels.length > 0 ? (
            <View style={styles.list} accessibilityRole="radiogroup">
              {filteredModels.map((model, index) => (
                <ModelOptionRow
                  key={model.id}
                  title={model.name}
                  detail={[
                    t('common:units.cc', { value: formatNumber(model.displacementCc) }),
                    t(`garage:categories.${model.category}`),
                  ].join(separator)}
                  selected={model.id === selectedModelId}
                  onPress={() => selectModel(model.id)}
                  showDivider={index < filteredModels.length - 1}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noResults}>{t('model.noResults')}</Text>
          )}
        </>
      ) : null}

      {showManualEntry ? (
        <TextField
          label={t('model.manualLabel')}
          placeholder={t('model.manualPlaceholder')}
          value={manualModel}
          onChangeText={changeManualModel}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      ) : null}

      <View style={styles.yearSection}>
        <Text style={styles.sectionLabel}>{t('model.yearLabel')}</Text>
        <View style={styles.yearOptions} accessibilityRole="radiogroup" accessibilityLabel={t('model.yearLabel')}>
          {recentYears.map((year) => (
            <SelectableChip
              key={year}
              label={String(year)}
              selected={yearChoice === year}
              onPress={() => setYearChoice(yearChoice === year ? undefined : year)}
              role="radio"
              showCheck={false}
              style={styles.yearChip}
            />
          ))}
          <SelectableChip
            label={t('model.yearOther')}
            selected={yearChoice === 'other'}
            onPress={() => setYearChoice(yearChoice === 'other' ? undefined : 'other')}
            role="radio"
            showCheck={false}
            style={styles.yearChip}
          />
        </View>
        {yearChoice === 'other' ? (
          <TextField
            value={otherYear}
            onChangeText={(text) => setOtherYear(text.replace(/\D/g, ''))}
            placeholder={t('model.yearOtherPlaceholder')}
            accessibilityLabel={t('model.yearLabel')}
            keyboardType="number-pad"
            maxLength={YEAR_LENGTH}
            autoFocus
            errorText={
              otherYear.length === YEAR_LENGTH && !otherYearValid
                ? t('model.yearInvalid', { min: MIN_MODEL_YEAR, max: maxModelYear() })
                : undefined
            }
          />
        ) : null}
      </View>
    </RegistrationStepScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  noResults: {
    ...typography.body,
    color: colors.textSecondary,
  },
  yearSection: {
    gap: 10,
  },
  sectionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  yearOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearChip: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
});
