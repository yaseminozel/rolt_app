import { Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useRideRecord } from '@/features/rides/queries';
import { RideFormProvider } from '@/features/rides/RideFormProvider';
import { colors, layout } from '@/theme';

type ScreenOptions = ComponentProps<typeof Stack.Screen>['options'];

const sheet = (detents: number[] | 'fitToContents' = 'fitToContents'): ScreenOptions => ({
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: detents,
  sheetGrabberVisible: true,
});

/**
 * A recorded ride: save form (08.05) and its sheets (08.06–08.08), saved (08.11), detail
 * (09.06) with its options, and edit (09.07). One `RideFormProvider` holds the editable details.
 */
export default function RideLayout() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { t } = useTranslation('rides');
  const { data: ride, isPending } = useRideRecord(rideId);

  if (!ride) {
    return (
      <View style={styles.state}>
        {isPending ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <EmptyState
            title={t('detail.notFound.title')}
            description={t('detail.notFound.description')}
          />
        )}
      </View>
    );
  }

  return (
    <RideFormProvider ride={ride}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.surface },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="save" />
        <Stack.Screen name="edit" />
        <Stack.Screen name="saved" options={{ animation: 'fade' }} />
        <Stack.Screen name="ride-type" options={sheet([0.72])} />
        <Stack.Screen name="visibility" options={sheet()} />
        <Stack.Screen name="photo-source" options={sheet()} />
        <Stack.Screen name="difficulty" options={sheet()} />
        <Stack.Screen name="surface" options={sheet()} />
        <Stack.Screen name="options" options={sheet()} />
      </Stack>
    </RideFormProvider>
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
