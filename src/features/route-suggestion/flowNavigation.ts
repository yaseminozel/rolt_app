import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Leaves the "Rota öner" flow for Discover (× on 04.5 / 04.6, "Keşfete dön", "Arka planda
 * devam et"). The flow is only opened from Discover, so this pops the whole flow off the root
 * stack and lands on the Discover tab; if Discover is not in the history it replaces instead.
 */
export function closeSuggestRouteFlow() {
  router.dismissTo('/discover');
}

/**
 * Android hardware back while the screen is focused. `handler` returns `true` when it handled
 * the press (the native stack then does nothing). The layout's `gestureEnabled: false` only
 * covers the iOS swipe, so the sending / result screens use this for Android.
 */
export function useHardwareBack(handler: () => boolean) {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
      return () => subscription.remove();
    }, [handler]),
  );
}
