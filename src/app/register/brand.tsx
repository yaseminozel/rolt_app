import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type ScrollView } from 'react-native';

import { motorcycleBrandNames, type MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { BrandTile, ManualBrandTile } from '@/components/registration/BrandTile';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { SearchField } from '@/components/ui/SearchField';
import { TextField } from '@/components/ui/TextField';
import { REGISTRATION_BRANDS } from '@/features/registration/garageOptions';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import type { RegistrationDraft } from '@/features/registration/types';
import { matchesSearch } from '@/lib/searchText';

const COLUMNS = 3;
/** Gap between tiles and rows ("Marka ızgarası", QKDo5). */
const GRID_GAP = 10;

/** Clears the model step whenever the brand changes. */
const CLEARED_MODEL: Partial<RegistrationDraft> = {
  modelId: undefined,
  customModelName: undefined,
  modelYear: undefined,
};

type GridCell = { kind: 'brand'; brand: MotorcycleBrand } | { kind: 'manual'; span: number } | { kind: 'spacer' };

/**
 * 00.9 Kayıt / 2 · Motor markası (Pencil `QKDo5`).
 * "Devam et" needs a brand. "Listede yok mu?" switches to manual entry: the tile is selected
 * and a "Marka adı" field appears under the grid. "Atla" skips the bike entirely (brand and
 * model, since the model step depends on the brand) and goes to the riding style step.
 */
export default function RegisterBrandScreen() {
  const { t } = useTranslation(['registration', 'common']);
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [query, setQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(draft.brand);
  const [manualMode, setManualMode] = useState(draft.customBrandName !== undefined);
  const [manualName, setManualName] = useState(draft.customBrandName ?? '');

  const rows = useMemo(() => buildGrid(query), [query]);
  const trimmedManualName = manualName.trim();
  const canContinue = selectedBrand !== undefined || (manualMode && trimmedManualName.length > 0);

  const selectBrand = (brand: MotorcycleBrand) => {
    setSelectedBrand(brand);
    setManualMode(false);
  };

  const startManualEntry = () => {
    setSelectedBrand(undefined);
    setManualMode(true);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (selectedBrand) {
      updateDraft({
        brand: selectedBrand,
        customBrandName: undefined,
        ...(selectedBrand !== draft.brand ? CLEARED_MODEL : null),
      });
    } else {
      updateDraft({
        brand: undefined,
        customBrandName: trimmedManualName,
        ...(trimmedManualName !== draft.customBrandName ? CLEARED_MODEL : null),
      });
    }
    router.push('/register/model');
  };

  const handleSkip = () => {
    updateDraft({ brand: undefined, customBrandName: undefined, ...CLEARED_MODEL });
    router.push('/register/riding-style');
  };

  return (
    <RegistrationStepScreen
      step={2}
      heading={t('brand.heading')}
      description={t('brand.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={handleContinue}
      ctaDisabled={!canContinue}
      onSkip={handleSkip}
      scrollRef={scrollRef}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('brand.searchPlaceholder')}
        variant="filled"
      />
      <View style={styles.grid} accessibilityRole="radiogroup">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, cellIndex) => {
              switch (cell.kind) {
                case 'brand':
                  return (
                    <BrandTile
                      key={cell.brand}
                      brand={cell.brand}
                      label={motorcycleBrandNames[cell.brand]}
                      selected={cell.brand === selectedBrand}
                      onPress={() => selectBrand(cell.brand)}
                      style={styles.cell}
                    />
                  );
                case 'manual':
                  return (
                    <ManualBrandTile
                      key="manual"
                      title={t('brand.manualTitle')}
                      subtitle={t('brand.manualSubtitle')}
                      selected={manualMode}
                      onPress={startManualEntry}
                      // Spans `span` columns including the gaps it covers.
                      style={{ flexGrow: cell.span, flexShrink: 1, flexBasis: (cell.span - 1) * GRID_GAP }}
                    />
                  );
                case 'spacer':
                  return <View key={`spacer-${cellIndex}`} style={styles.cell} />;
              }
            })}
          </View>
        ))}
      </View>
      {manualMode ? (
        // Bring the revealed field into view once it has been laid out.
        <View onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <TextField
          label={t('brand.manualLabel')}
          placeholder={t('brand.manualPlaceholder')}
          value={manualName}
          onChangeText={setManualName}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          />
        </View>
      ) : null}
    </RegistrationStepScreen>
  );
}

/**
 * Lays the filtered brands out in rows of three and appends the manual-entry tile: it fills
 * the last row when two columns are free (as in the design), otherwise it takes a full row.
 */
function buildGrid(query: string): GridCell[][] {
  const brands = REGISTRATION_BRANDS.filter((brand) => matchesSearch(motorcycleBrandNames[brand], query));
  const rows: GridCell[][] = [];
  for (let index = 0; index < brands.length; index += COLUMNS) {
    rows.push(brands.slice(index, index + COLUMNS).map((brand) => ({ kind: 'brand', brand })));
  }

  const lastRow = rows.at(-1);
  if (lastRow && lastRow.length === 1) {
    lastRow.push({ kind: 'manual', span: COLUMNS - 1 });
  } else {
    if (lastRow && lastRow.length < COLUMNS) {
      lastRow.push(...Array.from({ length: COLUMNS - lastRow.length }, () => ({ kind: 'spacer' as const })));
    }
    rows.push([{ kind: 'manual', span: COLUMNS }]);
  }
  return rows;
}

const styles = StyleSheet.create({
  grid: {
    gap: GRID_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});
