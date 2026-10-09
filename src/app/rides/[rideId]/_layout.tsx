import { Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

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

const commentsSheet: ScreenOptions = {
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: [0.7, 1],
  sheetGrabberVisible: true,
};

const screenOptions: ScreenOptions = {
  headerShown: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.surface },
};

/**
 * A recorded ride: save form (08.05) and its sheets (08.06–08.08), saved (08.11), detail
 * (09.06) with its options and comments, and edit (09.07). One `RideFormProvider` holds the
 * editable details. A ride that isn't on this device (another rider's, a shared link, a saved
 * ride) opens read-only from the server: only the detail and its comments.
 */
export default function RideLayout() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { data: ride, isPending } = useRideRecord(rideId);

  if (isPending) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="comments" options={commentsSheet} />
      </Stack>
    );
  }

  return (
    <RideFormProvider ride={ride}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="comments" options={commentsSheet} />
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
