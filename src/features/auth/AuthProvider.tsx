import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearOnboardingSeen,
  loadAuthState,
  saveGuest,
  saveOnboardingSeen,
  savePermissionPromptsPending,
  saveSession,
} from './authStorage';
import { hasSupabase, supabase } from '@/lib/supabase/client';

import { mockAuthService } from './mockAuthService';
import { runAfterSignIn } from './sessionHooks';
import { supabaseAuthService } from './supabaseAuthService';
import type { AuthService, ProviderSignInOptions, Session, SocialProvider } from './types';

/** Supabase Auth when `.env` points at the backend; the mock otherwise (Expo Go demos). */
const defaultService: AuthService = hasSupabase ? supabaseAuthService : mockAuthService;

type AuthContextValue = {
  /** False until persisted state has been read; the root layout waits on it. */
  isReady: boolean;
  session: Session | null;
  isGuest: boolean;
  hasSeenOnboarding: boolean;
  /** Signed in with a verified address and a finished profile, or browsing as a guest. */
  canUseApp: boolean;
  /** Signed in with a new email account whose verification link (02.07) isn't opened yet. */
  needsEmailVerification: boolean;
  /** Signed in and verified, but the registration flow (04.x) is not finished yet. */
  needsProfile: boolean;
  /**
   * The location / notification permission sheet (03.01–03.02) is still due: set when a
   * sign-in lands on an account without a finished profile, shown over the next screen.
   */
  needsPermissionPrompts: boolean;
  service: AuthService;
  markOnboardingSeen: () => void;
  continueAsGuest: () => void;
  /** Leaves guest mode so the signed-out auth flow is shown again (guest sign-in prompt, 00.15). */
  leaveGuestMode: () => void;
  finishPermissionPrompts: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialProvider, options?: ProviderSignInOptions) => Promise<void>;
  /** Opens a verification link; rejects with `expired-token` / `invalid-token`. */
  verifyEmail: (token: string) => Promise<void>;
  /** Re-reads the account (e.g. verification done in the mail app); keeps the session on failure. */
  refreshSession: () => Promise<void>;
  completeProfile: () => Promise<void>;
  /** 10.03: throws `invalid-credentials` for a wrong current password. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 10.16: deletes the account, then starts over from onboarding like signing out. */
  deleteAccount: (reason?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  service?: AuthService;
};

export function AuthProvider({ children, service = defaultService }: AuthProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [permissionPromptsPending, setPermissionPromptsPending] = useState(false);

  useEffect(() => {
    loadAuthState().then(async (state) => {
      let stored = state.session;
      if (stored && hasSupabase && service === supabaseAuthService && stored.emailVerified !== false) {
        // The app session mirrors Supabase's: without a stored Supabase session (e.g. signed in
        // with the mock before the backend existed) the rider signs in again.
        const { data } = await supabase.auth.getSession();
        if (!data.session || data.session.user.id !== stored.userId) {
          stored = null;
          saveSession(null);
        }
      }
      setSession(stored);
      setIsGuest(state.isGuest);
      setHasSeenOnboarding(state.hasSeenOnboarding);
      setPermissionPromptsPending(state.permissionPromptsPending);
      setIsReady(true);
      if (stored) {
        if (stored.emailVerified !== false) {
          runAfterSignIn();
        }
        // Offline is fine: the stored session stays; flags (and a verification done meanwhile)
        // refresh when the backend answers.
        service.refreshSession(stored).then((fresh) => {
          setSession(fresh);
          saveSession(fresh);
        }, () => undefined);
      }
    });
  }, [service]);

  // A session ended on the server (refresh token revoked, account deleted elsewhere) signs out here.
  useEffect(() => {
    if (!hasSupabase || service !== supabaseAuthService) {
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (event === 'SIGNED_OUT' && !supabaseSession) {
        setSession((current) => {
          if (current && current.emailVerified !== false) {
            saveSession(null);
            return null;
          }
          return current;
        });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [service]);

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

  const setPromptsPending = useCallback((pending: boolean) => {
    setPermissionPromptsPending(pending);
    savePermissionPromptsPending(pending);
  }, []);

  const finishPermissionPrompts = useCallback(() => setPromptsPending(false), [setPromptsPending]);

  /** Sign-in entry points: a new (or never finished) account still owes the permission sheet. */
  const enterSession = useCallback(
    (next: Session) => {
      if (!next.profileCompleted) {
        setPromptsPending(true);
      }
      applySession(next);
    },
    [applySession, setPromptsPending],
  );

  const signIn = useCallback(
    async (email: string, password: string) => enterSession(await service.signIn(email, password)),
    [enterSession, service],
  );

  const signUp = useCallback(
    async (email: string, password: string) => enterSession(await service.signUp(email, password)),
    [enterSession, service],
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider, options?: ProviderSignInOptions) =>
      enterSession(await service.signInWithProvider(provider, options)),
    [enterSession, service],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      const verified = await service.verifyEmail(token);
      // Confirmed, but this device has no password to sign in with: back to sign-in (02.01).
      applySession(verified);
    },
    [applySession, service],
  );

  const refreshSession = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      applySession(await service.refreshSession(session));
    } catch {
      // Offline or a backend hiccup: keep the current session and try again later.
    }
  }, [applySession, service, session]);

  const completeProfile = useCallback(async () => {
    if (session) {
      applySession(await service.completeProfile(session));
    }
  }, [applySession, service, session]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (session) {
        applySession(await service.changePassword(session, currentPassword, newPassword));
      }
    },
    [applySession, service, session],
  );

  const signOut = useCallback(async () => {
    await service.signOut();
    setPromptsPending(false);
    // Signing out starts over from onboarding, like a fresh install.
    setHasSeenOnboarding(false);
    clearOnboardingSeen();
    applySession(null);
  }, [applySession, service, setPromptsPending]);

  const deleteAccount = useCallback(
    async (reason?: string) => {
      if (!session) {
        return;
      }
      await service.deleteAccount(session, reason);
      setPromptsPending(false);
      setHasSeenOnboarding(false);
      clearOnboardingSeen();
      applySession(null);
    },
    [applySession, service, session, setPromptsPending],
  );

  // Sessions stored before verification existed have no flag and count as verified.
  const verified = session !== null && session.emailVerified !== false;

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      session,
      isGuest,
      hasSeenOnboarding,
      canUseApp: isGuest || (verified && session?.profileCompleted === true),
      needsEmailVerification: session !== null && !verified,
      needsProfile: verified && session?.profileCompleted === false,
      needsPermissionPrompts: verified && permissionPromptsPending,
      service,
      markOnboardingSeen,
      continueAsGuest,
      leaveGuestMode,
      finishPermissionPrompts,
      signIn,
      signUp,
      signInWithProvider,
      verifyEmail,
      refreshSession,
      completeProfile,
      changePassword,
      signOut,
      deleteAccount,
    }),
    [
      verified,
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
      verifyEmail,
      refreshSession,
      completeProfile,
      changePassword,
      signOut,
      deleteAccount,
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
