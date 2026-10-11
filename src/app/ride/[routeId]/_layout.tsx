import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { RideSessionProvider } from '@/features/navigation/RideSessionProvider';
import { useRoute } from '@/features/routes/queries';
import { colors, layout } from '@/theme';

type ScreenOptions = ComponentProps<typeof Stack.Screen>['options'];

const sheet = (detents: number[] | 'fitToContents'): ScreenOptions => ({
  presentation: 'formSheet',
  sheetAllowedDetents: detents,
  sheetGrabberVisible: true,
});

/**
 * "Rotayı sür" (06.01–06.07) for one route: hazırlık → durak ekle / önizleme → arka plan izni →
 * geri sayım → navigasyon → varış. Full-screen map screens without the tab bar; the option
 * lists and confirmations are native form sheets. One `RideSessionProvider` holds the ride.
 */
export default function RideLayout() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation('routeDetail');
  const { data, isPending, refetch } = useRoute(routeId);
  // The ride plan, stops and arrival follow the exact line; a list's simplified copy never rides.
  const simplified = data?.geometryDetail === 'simplified';
  const route = simplified ? undefined : data;

  useEffect(() => {
    if (simplified) {
      refetch();
    }
  }, [refetch, simplified]);

  if (!route) {
    return (
      <View style={styles.state}>
        {isPending || simplified ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <EmptyState title={t('notFound.title')} description={t('notFound.description')} />
        )}
      </View>
    );
  }

  return (
    <RideSessionProvider route={route}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Screen name="prepare" />
        {/* 800 of 852 pt (06.02 "Bottom Sheet / Durak ekle"). */}
        <Stack.Screen name="add-stop" options={sheet([0.94])} />
        <Stack.Screen name="pick-on-map" />
        <Stack.Screen name="stop-preview" />
        {/* Tall content (options, benefits): fixed detents so small phones scroll inside the sheet. */}
        <Stack.Screen name="background-permission" options={sheet([0.92, 1])} />
        <Stack.Screen name="countdown" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="navigate" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="exit-confirm" options={sheet('fitToContents')} />
      </Stack>
    </RideSessionProvider>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
