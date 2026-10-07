import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { RadioButton } from '@/components/ui/RadioButton';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';
import { REACH_WINDOWS } from '@/features/routes/queries';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';
import { colors, spacing } from '@/theme';

/**
 * Picker behind the "Başlangıca 1 saat içinde" chip (05.03 `r7NfD9`). The chevron implies a
 * picker but none is drawn, so it mirrors the "Sırala" sheet: a native form sheet sized to its
 * content whose options apply and close at once. Shares the window with Home's selector.
 */
export default function ReachWindowScreen() {
  const { t } = useTranslation('discover');
  const router = useRouter();
  const bottomPadding = useSheetBottomPadding((bottom) => Math.max(bottom, spacing.lg));
  const { reachWindow, setReachWindow } = useDiscoverState();

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <SheetHeader title={t('reach.sheetTitle')} style={styles.header} />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('reach.sheetTitle')}
        style={styles.options}>
        {REACH_WINDOWS.map((option) => (
          <RadioButton
            key={option}
            label={t(`reach.sheetOptions.${option}`)}
            selected={option === reachWindow}
            onPress={() => {
              setReachWindow(option);
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
