import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

let managersBound = false;

/** React Native wiring for React Query: refetch on app focus, pause while offline. */
function bindManagers() {
  if (managersBound || Platform.OS === 'web') {
    return;
  }
  managersBound = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status) => setFocused(status === 'active'));
    return () => subscription.remove();
  });
}

/**
 * The app's query client. Data is fresh for 30 s (lists don't refetch on every screen visit),
 * kept 10 min after the last screen leaves it, retried twice on failure (never on 4xx answers,
 * which won't change on retry).
 */
export function createQueryClient() {
  bindManagers();
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number; cause?: { status?: number } }).status ??
            (error as { cause?: { status?: number } }).cause?.status;
          return failureCount < 2 && !(status && status >= 400 && status < 500);
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}
