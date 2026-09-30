import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  loadAuthState,
  saveGuest,
  saveOnboardingSeen,
  savePermissionPromptsPending,
  saveSession,
} from './authStorage';
import { mockAuthService } from './mockAuthService';
import type { AuthService, Session, SocialProvider } from './types';

type AuthContextValue = {
  /** False until persisted state has been read; the root layout waits on it. */
  isReady: boolean;
  session: Session | null;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  /** Signed in with a finished profile, or browsing as a guest. */
  canUseApp: boolean;
  /** Signed in but the registration flow is not finished yet. */
  needsProfile: boolean;
  /** Registration just finished; the location / notification permission screens (00.13–00.14) come next. */
  needsPermissionPrompts: boolean;
  service: AuthService;
  markOnboardingSeen: () => void;
  continueAsGuest: () => void;
  /** Leaves guest mode so the signed-out auth flow is shown again (guest sign-in prompt, 00.15). */
  leaveGuestMode: () => void;
  finishPermissionPrompts: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  completeProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  service?: AuthService;
};

export function AuthProvider({ children, service = mockAuthService }: AuthProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [permissionPromptsPending, setPermissionPromptsPending] = useState(false);

  useEffect(() => {
    loadAuthState().then((state) => {
      setSession(state.session);
      setIsGuest(state.isGuest);
      setHasSeenOnboarding(state.hasSeenOnboarding);
      setPermissionPromptsPending(state.permissionPromptsPending);
      setIsReady(true);
    });
  }, []);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    setIsGuest(false);
    saveSession(next);
    saveGuest(false);
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setHasSeenOnboarding(true);
    saveOnboardingSeen();
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    saveGuest(true);
  }, []);

  const leaveGuestMode = useCallback(() => {
    setIsGuest(false);
    saveGuest(false);
  }, []);

  const finishPermissionPrompts = useCallback(() => {
    setPermissionPromptsPending(false);
    savePermissionPromptsPending(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => applySession(await service.signIn(email, password)),
    [applySession, service],
  );

  const signUp = useCallback(
    async (email: string, password: string) => applySession(await service.signUp(email, password)),
    [applySession, service],
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => applySession(await service.signInWithProvider(provider)),
    [applySession, service],
  );

  const completeProfile = useCallback(async () => {
    if (session) {
      const completed = await service.completeProfile(session);
      setPermissionPromptsPending(true);
      savePermissionPromptsPending(true);
      applySession(completed);
    }
  }, [applySession, service, session]);

  const signOut = useCallback(async () => {
    await service.signOut();
    setPermissionPromptsPending(false);
    savePermissionPromptsPending(false);
    applySession(null);
  }, [applySession, service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      session,
      isGuest,
      hasSeenOnboarding,
      canUseApp: isGuest || session?.profileCompleted === true,
      needsProfile: session !== null && !session.profileCompleted,
      needsPermissionPrompts: session?.profileCompleted === true && permissionPromptsPending,
      service,
      markOnboardingSeen,
      continueAsGuest,
      leaveGuestMode,
      finishPermissionPrompts,
      signIn,
      signUp,
      signInWithProvider,
      completeProfile,
      signOut,
    }),
    [
      isReady,
      session,
      isGuest,
      hasSeenOnboarding,
      permissionPromptsPending,
      service,
      markOnboardingSeen,
      continueAsGuest,
      leaveGuestMode,
      finishPermissionPrompts,
      signIn,
      signUp,
      signInWithProvider,
      completeProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
