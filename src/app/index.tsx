import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

/** Entry point: sends the user to the first screen their auth state allows. */
export default function Index() {
  const { canUseApp, needsProfile, needsPermissionPrompts, hasSeenOnboarding } = useAuth();

  if (needsPermissionPrompts) {
    return <Redirect href="/permissions/location" />;
  }
  if (canUseApp) {
    return <Redirect href="/discover" />;
  }
  if (needsProfile) {
    return <Redirect href="/register/profile" />;
  }
  return <Redirect href={hasSeenOnboarding ? '/sign-in' : '/onboarding'} />;
}
