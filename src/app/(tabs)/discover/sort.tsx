import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { RadioButton } from '@/components/ui/RadioButton';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import type { RouteSort } from '@/features/routes/types';
import { colors, spacing } from '@/theme';

const SORT_OPTIONS: readonly RouteSort[] = ['recommended', 'nearest', 'shortest', 'longest', 'popular'];

/**
 * "Sırala" sheet (p9FVL → `zLNlt`) as a native form sheet sized to its content.
 * Picking an option applies it to the search results and closes the sheet.
 */
export default function RouteSortScreen() {
  const { t } = useTranslation('routes');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sort, setSort } = useDiscoverState();

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <SheetHeader title={t('sort.title')} style={styles.header} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('sort.title')} style={styles.options}>
        {SORT_OPTIONS.map((option) => (
          <RadioButton
            key={option}
            label={t(`sort.${option}`)}
            selected={option === sort}
            onPress={() => {
              setSort(option);
              router.back();
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the title.
  header: {
    paddingTop: spacing.lg,
  },
  options: {
    paddingHorizontal: spacing.lg,
  },
});
