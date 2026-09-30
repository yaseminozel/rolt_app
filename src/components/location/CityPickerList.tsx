import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { SearchField } from '@/components/ui/SearchField';
import { TURKISH_CITIES_ALPHABETICAL } from '@/features/location/turkishCities';
import { matchesSearch } from '@/lib/searchText';
import { colors, layout, spacing, typography } from '@/theme';

import { CityOptionRow } from './CityOptionRow';

export type CityPickerListProps = {
  title: string;
  searchPlaceholder: string;
  noResultsText: string;
  /** Province name currently chosen, drawn with a check. */
  selectedCity: string | undefined;
  onSelect: (city: string) => void;
  onClose: () => void;
};

/**
 * Province picker body for native form sheets (registration "Şehir", Discover region).
 * No dedicated frame exists: it follows the option sheets (e.g. "Dil", `vfpFt`) —
 * SheetHeader with close, search (Turkish-insensitive), and single-choice rows with a check.
 *
 * Render it as the screen root. It returns two siblings on purpose: react-native-screens
 * sizes a form sheet's scroll view to the visible sheet only when the screen root has at most
 * two children — a non-collapsable header and the scroll view — so the title and search stay
 * pinned while the list scrolls inside the current detent. Scrolling the list expands the
 * sheet to full height (iOS default), and the list insets itself above the keyboard.
 */
export function CityPickerList({
  title,
  searchPlaceholder,
  noResultsText,
  selectedCity,
  onSelect,
  onClose,
}: CityPickerListProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const cities = useMemo(
    () => TURKISH_CITIES_ALPHABETICAL.filter((city) => matchesSearch(city.name, query)),
    [query],
  );

  return (
    <>
      <View collapsable={false} style={styles.header}>
        <SheetHeader title={title} onClose={onClose} style={styles.title} />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          variant="filled"
          containerStyle={styles.search}
        />
      </View>
      <FlatList
        style={styles.list}
        data={cities}
        keyExtractor={(city) => city.plateCode}
        renderItem={({ item }) => (
          <CityOptionRow label={item.name} selected={item.name === selectedCity} onPress={() => onSelect(item.name)} />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        ListEmptyComponent={<Text style={styles.empty}>{noResultsText}</Text>}
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
