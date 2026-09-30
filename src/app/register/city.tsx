import { Stack, useRouter } from 'expo-router';
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
import { colors, layout, radius, spacing, typography } from '@/theme';

/**
 * City picker for 00.8 "Şehir", presented as a native form sheet. No dedicated frame exists:
 * it follows the option sheets (e.g. "Dil", `vfpFt`) — SheetHeader with close, search, and
 * single-choice rows with a check on the current city. Picking a city saves it and closes.
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
    <View style={styles.container}>
      <Stack.Screen
        options={{ sheetGrabberVisible: true, sheetCornerRadius: radius.xl, sheetAllowedDetents: [1] }}
      />
      <SheetHeader title={t('city.title')} onClose={() => router.back()} style={styles.header} />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('city.searchPlaceholder')}
        variant="filled"
        containerStyle={styles.search}
      />
      <FlatList
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
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        ListEmptyComponent={<Text style={styles.empty}>{t('city.noResults')}</Text>}
        initialNumToRender={20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the header.
  header: {
    paddingTop: spacing.lg,
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
