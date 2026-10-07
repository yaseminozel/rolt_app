import type { ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { SearchField } from '@/components/ui/SearchField';
import { colors, fontFamily, layout, spacing } from '@/theme';

type OptionSheetListProps<T> = {
  title: string;
  onClose: () => void;
  /** Search above the list (Marka, Model); the year sheet has none. */
  search?: { value: string; onChangeText: (text: string) => void; placeholder: string };
  /** Uppercase group line above the rows, e.g. "BAJAJ MODELLERİ". */
  sectionTitle?: string;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
};

/**
 * Body of the bike option sheets (04.04 `M3llIj`, 04.05 `V4YviO`, 04.06 `su2g3`): sheet title
 * with close, optional search, optional section line and rows split by inset lines.
 *
 * Render it as the screen root. Like `CityPickerList` it returns two siblings so
 * react-native-screens keeps the header pinned and scrolls the list inside the sheet.
 */
export function OptionSheetList<T>({
  title,
  onClose,
  search,
  sectionTitle,
  data,
  keyExtractor,
  renderItem,
}: OptionSheetListProps<T>) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <View collapsable={false} style={styles.header}>
        <SheetHeader title={title} onClose={onClose} style={styles.title} />
        {search ? (
          <SearchField
            value={search.value}
            onChangeText={search.onChangeText}
            placeholder={search.placeholder}
            containerStyle={styles.search}
          />
        ) : null}
      </View>
      <FlatList
        style={styles.list}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          sectionTitle ? <Text style={styles.section}>{sectionTitle}</Text> : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        initialNumToRender={16}
      />
    </>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the title.
  title: {
    paddingTop: spacing.lg,
  },
  search: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    marginHorizontal: layout.screenGutter,
  },
  list: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // "Bölüm başlığı": 12 pt semibold, 5 % tracking, uppercase.
  section: {
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    marginHorizontal: layout.screenGutter,
    backgroundColor: colors.border,
  },
});
