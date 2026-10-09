import { useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { StatusIcon } from '@/components/feedback/StatusIcon';
import { Button } from '@/components/ui/Button';
import { reportError, setErrorScreen } from '@/features/analytics/errorReporting';
import { colors, spacing, typography } from '@/theme';

type BoundaryState = { error: Error | null };

/**
 * Root error boundary: a render error shows a small "Bir şeyler ters gitti" screen with
 * "Yeniden dene" instead of a white screen, and is reported (`app_errors`). It sits inside the
 * app's providers, so a running ride recording keeps going and "Yeniden dene" re-mounts only the
 * navigator.
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <>
      <ScreenTracker />
      <Boundary>{children}</Boundary>
    </>
  );
}

/** Keeps the route pattern (no ids) for error reports. */
function ScreenTracker() {
  const segments = useSegments();
  const screen = segments.join('/');
  useEffect(() => {
    setErrorScreen(screen || 'index');
  }, [screen]);
  return null;
}

class Boundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    // An error on the first render must not leave the splash screen up.
    SplashScreen.hideAsync().catch(() => undefined);
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { kind: 'boundary', isFatal: false, componentStack: info.componentStack });
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <StatusIcon status="error" />
      <Text style={styles.title} accessibilityRole="header">
        {t('errorBoundary.title')}
      </Text>
      <Text style={styles.description}>{t('errorBoundary.description')}</Text>
      <Button label={t('errorBoundary.retry')} onPress={onRetry} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
});
