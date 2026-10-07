import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Entry point: sends the user to the first screen their auth state allows. The permission
 * sheet is not a destination; the screen underneath presents it (`usePermissionPromptSheet`).
 */
export default function Index() {
  const { canUseApp, needsEmailVerification, needsProfile, hasSeenOnboarding } = useAuth();

  if (needsEmailVerification) {
    return <Redirect href="/email-verification" />;
  }
  if (canUseApp) {
    return <Redirect href="/discover" />;
  }
  if (needsProfile) {
    return <Redirect href="/register/profile" />;
  }
  return <Redirect href={hasSeenOnboarding ? '/sign-in' : '/onboarding'} />;
}
