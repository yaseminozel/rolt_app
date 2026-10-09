import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** From the record sheet's top edge to its top buttons (Pencil `w90Kk`, "Kapat (aşağı)" y 22). */
export const RECORD_SHEET_TOP_GAP = 22;

/**
 * Top inset inside the record sheet and the calibration screen. iOS presents them as a native
 * page sheet that already starts below the status bar, so the window's safe area does not apply
 * (the root safe-area context would add it twice); Android presents them full screen.
 */
export function useSheetTopInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? 0 : insets.top;
}
