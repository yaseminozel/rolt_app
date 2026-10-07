import { Stack } from 'expo-router';

/**
 * Email verification for a new email account (02.07), between creating the password and
 * the permission sheet. No back: the account exists already; "Giriş ekranına dön" signs out.
 */
export default function EmailVerificationLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
