import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from '@/components/ui/FilterChip';
import type { RouteFilter } from '@/features/routes/types';
import { layout, spacing } from '@/theme';

/** Chip order of "Route categories" (p4CIJi `bzKrN`). */
const HOME_FILTERS: readonly RouteFilter[] = ['all', 'nearby', 'coast', 'curvy', 'scenic'];

type RouteFilterChipsProps = {
  value: RouteFilter;
  onChange: (filter: RouteFilter) => void;
};

/**
 * Discover Home category chips "Tümü / Yakın Rotalar / Sahil / Virajlı / Manzara" as
 * single-choice `FilterChip` toggles, scrolling edge to edge under the 16 pt gutter.
 */
export function RouteFilterChips({ value, onChange }: RouteFilterChipsProps) {
  const { t } = useTranslation(['routes', 'discover']);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('discover:home.categoriesA11y')}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {HOME_FILTERS.map((filter) => (
        <FilterChip
          key={filter}
          type="toggle"
          showIcon={false}
          label={filter === 'all' || filter === 'nearby' ? t(`filters.${filter}`) : t(`tags.${filter}`)}
          selected={filter === value}
          onPress={() => onChange(filter)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed past the screen gutter so chips scroll to the screen edge.
  scroll: {
    marginHorizontal: -layout.screenGutter,
    flexGrow: 0,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
});
