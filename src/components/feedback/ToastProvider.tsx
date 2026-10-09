import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics, type HapticEffect } from '@/features/haptics/haptics';
import { layout } from '@/theme';

import { Toast, type ToastProps } from './Toast';

/** Toast content without layout props; see `Toast` for the variants. */
export type ToastOptions = Omit<ToastProps, 'style'> & {
  /** Milliseconds before auto-dismiss (default 3 s; 5 s when there is an action to tap). */
  duration?: number;
  /**
   * Distance above the bottom safe area. Defaults to clearing the floating tab bar;
   * screens without the tab bar pass a smaller value.
   */
  bottomOffset?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Each toast is felt as well as seen; a plain notice stays silent. */
const TOAST_HAPTICS: Record<ToastOptions['variant'], HapticEffect | null> = {
  success: 'success',
  failure: 'error',
  saved: 'tap',
  removed: 'tap',
  info: null,
};

const DEFAULT_DURATION_MS = 3000;
const ACTION_DURATION_MS = 5000;
const FADE_MS = 180;
/** Clears the native tab bar (the design places toasts 16 pt above the 72 pt floating bar). */
export const TOAST_OFFSET_ABOVE_TABS = 88;

/** App-wide single toast (latest wins), e.g. "Kaydedildi · Geri al" after bookmarking a route. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [opacity]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setToast(options);
      const effect = TOAST_HAPTICS[options.variant];
      if (effect) {
        haptics[effect]();
      }
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      const duration = options.duration ?? (options.actionLabel ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
      timer.current = setTimeout(hideToast, duration);
    },
    [hideToast, opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.container,
              { bottom: insets.bottom + (toast.bottomOffset ?? TOAST_OFFSET_ABOVE_TABS), opacity },
            ]}>
            <ToastContent toast={toast} onAction={hideToast} />
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastContent({ toast, onAction }: { toast: ToastOptions; onAction: () => void }) {
  if (toast.variant === 'saved' || toast.variant === 'removed' || toast.variant === 'info') {
    const { onActionPress } = toast;
    return (
      <Toast
        variant={toast.variant}
        message={toast.message}
        actionLabel={toast.actionLabel}
        onActionPress={
          onActionPress
            ? () => {
                haptics.tap();
                onActionPress();
                onAction();
              }
            : undefined
        }
      />
    );
  }
  return <Toast variant={toast.variant} message={toast.message} />;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
});
