import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from './AuthProvider';

/**
 * Presents the permission sheet (03.01–03.02) over the screen that uses this hook while the
 * prompts are due — registration for a new account. `navigate` won't stack a second sheet
 * if it is already open.
 */
export function usePermissionPromptSheet() {
  const { needsPermissionPrompts } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (needsPermissionPrompts) {
      router.navigate('/permissions');
    }
  }, [needsPermissionPrompts, router]);
}
