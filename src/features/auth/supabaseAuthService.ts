import { AuthError as SupabaseAuthError, type User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { i18n } from '@/i18n';
import { deviceStore } from '@/lib/deviceStore';
import { supabase } from '@/lib/supabase/client';

import { runAfterSignIn, runBeforeSignOut } from './sessionHooks';
import { AuthError, type AuthService, type Session, type SocialProvider } from './types';

/**
 * AuthService on the self-hosted Supabase Auth (GoTrue).
 *
 * - Email lookup (02.01) is the `lookup_email` RPC; the 3-attempt lockout (02.02) is the
 *   `hook_password_verification_attempt` auth hook, which answers `account_locked:<ISO time>`.
 * - Auth emails are sent by the `auth-email` edge function. Their https links (`auth-link`) confirm
 *   the address on the server and open `rolt://email-verification/confirm?token=verified|expired|invalid`,
 *   or pass the reset token on to `rolt://reset-password?token=…`.
 * - A new email account has no session until its address is confirmed. While 02.07 waits, the
 *   address and password are kept in the keychain so returning to the app (or opening the link)
 *   can sign in at once; they are removed as soon as the account is verified or signed out.
 * - Google (and Apple outside iOS) use the browser OAuth flow with PKCE; Apple on iOS uses the
 *   native sheet and an ID token.
 */

const PENDING_VERIFICATION_KEY = 'rolt.pendingVerification';
const VERIFICATION_SENT_KEY = 'rolt.auth.verificationSent';
const RESET_SENT_KEY = 'rolt.auth.resetSent';
const LOCKED_PREFIX = 'account_locked:';

type PendingVerification = { email: string; password: string };
type SentRecord = { email: string; sentAt: number };

const secureStore = {
  async get(key: string) {
    try {
      return Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string | null) {
    try {
      if (Platform.OS === 'web') {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } else if (value === null) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // Best effort: without it the rider signs in again after verifying.
    }
  },
};

async function readPending(): Promise<PendingVerification | null> {
  const raw = await secureStore.get(PENDING_VERIFICATION_KEY);
  return raw ? (JSON.parse(raw) as PendingVerification) : null;
}

const savePending = (pending: PendingVerification | null) =>
  secureStore.set(PENDING_VERIFICATION_KEY, pending ? JSON.stringify(pending) : null);

async function readSent(key: string): Promise<SentRecord | null> {
  const raw = await deviceStore.get(key);
  return raw ? (JSON.parse(raw) as SentRecord) : null;
}

const saveSent = (key: string, email: string) =>
  deviceStore.set(key, JSON.stringify({ email, sentAt: Date.now() } satisfies SentRecord));

const normalize = (email: string) => email.trim().toLowerCase();
const appLocale = () => (i18n.language === 'en' ? 'en' : 'tr');

/** Maps Supabase / network failures onto the app's auth error codes. */
function toAuthError(error: unknown): Error {
  if (error instanceof AuthError) {
    return error;
  }
  if (error instanceof SupabaseAuthError) {
    const message = error.message ?? '';
    if (message.startsWith(LOCKED_PREFIX)) {
      return new AuthError('account-locked', 'Too many failed attempts', {
        lockedUntil: new Date(message.slice(LOCKED_PREFIX.length)),
      });
    }
    switch (error.code) {
      case 'invalid_credentials':
        return new AuthError('invalid-credentials', 'Invalid email or password', {});
      case 'user_already_exists':
      case 'email_exists':
        return new AuthError('email-in-use', 'Email already registered');
      case 'otp_expired':
        return new AuthError('invalid-token', 'Link is invalid or expired');
    }
    if (error.status === 0 || error.name === 'AuthRetryableFetchError') {
      return new AuthError('network', 'Network request failed');
    }
    return error;
  }
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when the device is offline.
    return new AuthError('network', 'Network request failed');
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function call<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Throws the Supabase error of a `{ data, error }` result. */
function check<T extends { error: SupabaseAuthError | null }>(result: T): T {
  if (result.error) {
    throw toAuthError(result.error);
  }
  return result;
}

/** The user of a successful sign-in result; throws the Supabase error otherwise. */
function userOf(result: { data: { user: User | null }; error: SupabaseAuthError | null }): User {
  if (result.error) {
    throw toAuthError(result.error);
  }
  if (!result.data.user) {
    throw new Error('Auth response without a user');
  }
  return result.data.user;
}

function signInMethodOf(user: User): Session['signInMethod'] {
  const provider = user.app_metadata?.provider;
  return provider === 'google' || provider === 'apple' ? provider : 'email';
}

/** The app session for a signed-in Supabase user, with the profile state from the database. */
async function buildSession(user: User): Promise<Session> {
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('profile_completed').eq('id', user.id).maybeSingle(),
    supabase.from('user_settings').select('password_changed_at').eq('user_id', user.id).maybeSingle(),
  ]);
  return {
    userId: user.id,
    email: user.email ?? '',
    emailVerified: Boolean(user.email_confirmed_at) || signInMethodOf(user) !== 'email',
    profileCompleted: profile?.profile_completed ?? false,
    signInMethod: signInMethodOf(user),
    passwordChangedAt: settings?.password_changed_at ?? undefined,
  };
}

/** A new email account that is waiting for its verification link (02.07); no Supabase session yet. */
const unverifiedSession = (email: string, userId?: string): Session => ({
  userId: userId ?? `pending:${email}`,
  email,
  emailVerified: false,
  profileCompleted: false,
  signInMethod: 'email',
});

async function verifiedSignIn(email: string, password: string): Promise<Session> {
  const user = userOf(await supabase.auth.signInWithPassword({ email, password }));
  await savePending(null);
  const session = await buildSession(user);
  await runAfterSignIn();
  return session;
}

class ProviderSignInCancelled extends Error {
  constructor() {
    super('Sign-in cancelled');
    this.name = 'ProviderSignInCancelled';
  }
}

async function signInWithAppleNative(): Promise<User> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new ProviderSignInCancelled();
    }
    throw error;
  }
  if (!credential.identityToken) {
    throw new Error('Apple returned no identity token');
  }
  const user = userOf(
    await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken }),
  );
  // Apple shares the name only on the first sign-in: keep it for the profile.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (fullName && !user.user_metadata?.full_name) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    await supabase.from('profiles').update({ name: fullName }).eq('id', user.id).eq('name', '');
  }
  return user;
}

/** Browser OAuth with PKCE; the provider redirects back to rolt://auth/callback?code=…. */
async function signInWithBrowser(provider: SocialProvider, emailHint?: string): Promise<User> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data } = check(
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams:
          provider === 'google'
            ? { prompt: 'select_account', ...(emailHint ? { login_hint: emailHint } : {}) }
            : undefined,
      },
    }),
  );
  if (!data.url) {
    throw new Error('No OAuth URL');
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new ProviderSignInCancelled();
  }
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description') ?? new URLSearchParams(url.hash.slice(1)).get('error_description');
  if (!code) {
    throw new Error(errorDescription ?? 'OAuth sign-in failed');
  }
  return userOf(await supabase.auth.exchangeCodeForSession(code));
}

export const supabaseAuthService: AuthService = {
  lookupEmail: (email) =>
    call(async () => {
      const { data, error } = await supabase.rpc('lookup_email', { p_email: normalize(email) });
      if (error?.code === 'P0429') {
        throw new AuthError('rate-limited', 'Too many email lookups');
      }
      if (error) throw error;
      const result = data as { status: 'new' | 'password' | 'provider'; provider?: SocialProvider };
      return result.status === 'provider'
        ? { status: 'provider', provider: result.provider === 'apple' ? 'apple' : 'google' }
        : { status: result.status };
    }),

  signIn: (email, password) =>
    call(async () => {
      const address = normalize(email);
      const { data, error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error?.code === 'email_not_confirmed') {
        // Right password, address not confirmed yet: wait on 02.07.
        await savePending({ email: address, password });
        return unverifiedSession(address);
      }
      if (error) throw error;
      await savePending(null);
      const session = await buildSession(data.user);
      await runAfterSignIn();
      return session;
    }),

  signUp: (email, password) =>
    call(async () => {
      const address = normalize(email);
      const { data } = check(
        await supabase.auth.signUp({ email: address, password, options: { data: { locale: appLocale() } } }),
      );
      // GoTrue hides existing addresses behind a user without identities.
      if (data.user && data.user.identities?.length === 0) {
        throw new AuthError('email-in-use', 'Email already registered');
      }
      await saveSent(VERIFICATION_SENT_KEY, address);
      if (data.session && data.user) {
        // Auto-confirm is on (development): signed in at once.
        const session = await buildSession(data.user);
        await runAfterSignIn();
        return session;
      }
      await savePending({ email: address, password });
      return unverifiedSession(address, data.user?.id);
    }),

  signInWithProvider: (provider, options) =>
    call(async () => {
      try {
        const user =
          provider === 'apple' && Platform.OS === 'ios'
            ? await signInWithAppleNative()
            : await signInWithBrowser(provider, options?.emailHint);
        await savePending(null);
        const session = await buildSession(user);
        await runAfterSignIn();
        return session;
      } catch (error) {
        if (error instanceof ProviderSignInCancelled) {
          throw error;
        }
        throw toAuthError(error);
      }
    }),

  requestPasswordReset: (email) =>
    call(async () => {
      const address = normalize(email);
      check(await supabase.auth.resetPasswordForEmail(address));
      await saveSent(RESET_SENT_KEY, address);
    }),

  resetPassword: (token, newPassword) =>
    call(async () => {
      const sent = await readSent(RESET_SENT_KEY);
      if (!token || token === 'invalid') {
        throw new AuthError('invalid-token', 'Reset link is invalid');
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' });
      if (error) {
        if (error.code === 'otp_expired' && sent) {
          throw new AuthError('expired-token', 'Reset link expired', { email: sent.email, sentAt: new Date(sent.sentAt) });
        }
        throw new AuthError('invalid-token', 'Reset link is invalid');
      }
      check(await supabase.auth.updateUser({ password: newPassword }));
      // 02.06 sends the rider back to sign in with the new password.
      await supabase.auth.signOut({ scope: 'local' });
    }),

  requestEmailVerification: (email) =>
    call(async () => {
      const address = normalize(email);
      check(await supabase.auth.resend({ type: 'signup', email: address }));
      await saveSent(VERIFICATION_SENT_KEY, address);
    }),

  verifyEmail: (token) =>
    call(async () => {
      if (token === 'verified') {
        const pending = await readPending();
        if (pending) {
          return verifiedSignIn(pending.email, pending.password);
        }
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          return buildSession(data.user);
        }
        // Confirmed on another device: sign in with the password now.
        return null;
      }
      if (token === 'expired') {
        const sent = await readSent(VERIFICATION_SENT_KEY);
        const pending = await readPending();
        throw new AuthError('expired-token', 'Verification link expired', {
          email: pending?.email ?? sent?.email ?? '',
          sentAt: new Date(sent?.sentAt ?? Date.now()),
        });
      }
      throw new AuthError('invalid-token', 'Verification link is invalid');
    }),

  refreshSession: (session) =>
    call(async () => {
      if (session.emailVerified === false) {
        const pending = await readPending();
        if (!pending) {
          return session;
        }
        const { data, error } = await supabase.auth.signInWithPassword(pending);
        if (error?.code === 'email_not_confirmed') {
          return session;
        }
        if (error) throw error;
        await savePending(null);
        const verified = await buildSession(data.user);
        await runAfterSignIn();
        return verified;
      }
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return buildSession(data.user);
    }),

  completeProfile: (session) =>
    call(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_completed: true })
        .eq('id', session.userId);
      if (error) throw error;
      return { ...session, profileCompleted: true };
    }),

  changePassword: (session, currentPassword, newPassword) =>
    call(async () => {
      // Re-entering the current password proves it's the rider (and counts towards the lockout).
      check(await supabase.auth.signInWithPassword({ email: session.email, password: currentPassword }));
      check(await supabase.auth.updateUser({ password: newPassword }));
      return { ...session, passwordChangedAt: new Date().toISOString() };
    }),

  signOut: () =>
    call(async () => {
      await runBeforeSignOut();
      await savePending(null);
      await supabase.auth.signOut({ scope: 'local' });
    }),

  deleteAccount: (_session, reason) =>
    call(async () => {
      const { error } = await supabase.functions.invoke('delete-account', { body: { reason } });
      if (error) throw error;
      await savePending(null);
      // The server already removed the user; just forget the local session.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }),
};

/** True for the error a provider sheet throws when the rider closes it (screens stay silent). */
export const isProviderSignInCancelled = (error: unknown) => error instanceof ProviderSignInCancelled;

WebBrowser.maybeCompleteAuthSession();
