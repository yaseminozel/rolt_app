import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam } from '@/features/auth/credentials';
import { isAuthError } from '@/features/auth/types';
import { colors } from '@/theme';

/**
 * Target of the verification link (`rolt://email-verification/confirm?token=…`). Shows a
 * spinner while the token is checked; success lets the root guard move on, an expired or
 * invalid link opens 02.07 "Süresi dolmuş bağlantı" and a network failure returns to 02.07.
 */
export default function ConfirmEmailScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = firstParam(params.token);
  const { verifyEmail } = useAuth();

  useEffect(() => {
    verifyEmail(token).catch((error: unknown) => {
      if (isAuthError(error, 'expired-token') || isAuthError(error, 'invalid-token')) {
        router.replace('/email-verification/expired');
      } else {
        router.replace('/email-verification');
      }
    });
  }, [token, verifyEmail]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.textPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
