import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding for the content of a `fitToContents` form sheet. `total` is the space wanted
 * between the content and the sheet's bottom edge for the device's bottom inset. iOS already adds
 * the bottom safe area under such a sheet's content (filled by the screen's
 * `contentStyle.backgroundColor`), so only the rest is returned there; adding the inset again
 * left a double gap with a grey band on iOS 26.
 */
export function useSheetBottomPadding(total: (bottomInset: number) => number) {
  const { bottom } = useSafeAreaInsets();
  const coveredBySheet = Platform.OS === 'ios' ? bottom : 0;
  return Math.max(total(bottom) - coveredBySheet, 0);
}
