import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { CityOptionRow } from '@/components/registration/CityOptionRow';
import { SearchField } from '@/components/ui/SearchField';
import { matchesSearch } from '@/lib/searchText';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { TURKISH_CITIES_ALPHABETICAL } from '@/features/location/turkishCities';
import { colors, layout, spacing, typography } from '@/theme';

/**
 * City picker for 00.8 "Şehir", presented as a native form sheet. No dedicated frame exists:
 * it follows the option sheets (e.g. "Dil", `vfpFt`) — SheetHeader with close, search, and
 * single-choice rows with a check on the current city. Picking a city saves it and closes.
 *
 * Sheet layout (detents 60 % / 100 %, grabber and radius come from `register/_layout.tsx`):
 * react-native-screens sizes a form sheet's scroll view to the visible sheet only when the
 * screen root has at most two children — a non-collapsable header and the scroll view — so
 * the title and search stay pinned while the list scrolls inside the current detent.
 * Scrolling the list expands the sheet to full height (iOS default), and the list insets
 * itself above the keyboard while searching.
 */
export default function CityPickerScreen() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useRegistrationDraft();
  const [query, setQuery] = useState('');

  const cities = useMemo(
    () => TURKISH_CITIES_ALPHABETICAL.filter((city) => matchesSearch(city.name, query)),
    [query],
  );

  const selectCity = (name: string) => {
    updateDraft({ city: name });
    router.back();
  };

  return (
    <>
      <View collapsable={false} style={styles.header}>
        <SheetHeader title={t('city.title')} onClose={() => router.back()} style={styles.title} />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('city.searchPlaceholder')}
          variant="filled"
          containerStyle={styles.search}
        />
      </View>
      <FlatList
        style={styles.list}
        data={cities}
        keyExtractor={(city) => city.plateCode}
        renderItem={({ item }) => (
          <CityOptionRow
            label={item.name}
            selected={item.name === draft.city}
            onPress={() => selectCity(item.name)}
          />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        ListEmptyComponent={<Text style={styles.empty}>{t('city.noResults')}</Text>}
        initialNumToRender={20}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the title.
  title: {
    paddingTop: spacing.lg,
  },
  list: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  search: {
    marginHorizontal: layout.screenGutter,
    marginBottom: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.xxl,
  },
});
