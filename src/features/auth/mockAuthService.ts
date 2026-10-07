import { LOCK_DURATION_MINUTES } from './credentials';
import { AuthError, type AuthService, type Session, type SocialProvider } from './types';

/**
 * In-memory AuthService used until the Supabase integration. Delays make loading states visible.
 *
 * Accounts:
 * - `yasemin@example.com` / `12345678` — password account (the design's sample user).
 *   Three wrong passwords in a row lock password sign-in for 15 minutes (02.02 "Çok fazla
 *   deneme"); a successful sign-in resets the counter.
 * - `deniz@example.com` — created with Google (00.2 "Hesap Google ile bağlı").
 * - `ece@example.com` — created with Apple (same screen, Apple variant).
 * - Any other email is a new account (02.02 "Yeni hesap"). It starts unverified (02.07 "E-posta
 *   doğrulama"); returning to the app at least 5 s after the verification email was sent
 *   (`refreshSession`) counts as opening the link, so the flow can be tried without a mail
 *   client. The delay keeps system sheets right after sign-up (password autofill) from
 *   verifying instantly.
 * Google / Apple sign-in without an email hint returns `<provider>.user@example.com`, a new
 * account that goes through registration.
 *
 * Reset tokens (`rolt://reset-password?token=…`):
 * - `expired` → `expired-token` for yasemin@example.com, sent 45 minutes ago ("Bağlantının süresi dolmuş")
 * - empty or `invalid` → `invalid-token`
 * - anything else → success; sets the new password of the last email a reset was requested
 *   for and lifts its lock.
 *
 * Verification tokens (`rolt://email-verification/confirm?token=…`):
 * - `expired` → `expired-token` for the last address a verification was sent to, sent 25 hours ago
 * - empty or `invalid` → `invalid-token`
 * - anything else → verifies the last address a verification was sent to.
 */
const NETWORK_DELAY_MS = 800;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000;
const EXPIRED_TOKEN = 'expired';
const INVALID_TOKEN = 'invalid';
const EXPIRED_TOKEN_EMAIL = 'yasemin@example.com';
const EXPIRED_TOKEN_AGE_MS = 45 * 60 * 1000;
const EXPIRED_VERIFICATION_AGE_MS = 25 * 60 * 60 * 1000;
const SIMULATED_LINK_OPEN_DELAY_MS = 5000;

type MockAccount = {
  profileCompleted: boolean;
  emailVerified: boolean;
  /** Epoch ms of the last verification email, or null when none is pending. */
  verificationSentAt: number | null;
  failedAttempts: number;
  /** Epoch ms; password sign-in is blocked until then. */
  lockedUntil: number | null;
} & (
  | { method: 'password'; password: string; passwordChangedAt: number }
  | { method: 'provider'; provider: SocialProvider }
);

const DAY_MS = 24 * 60 * 60 * 1000;

const passwordAccount = (
  password: string,
  profileCompleted: boolean,
  passwordChangedAt = Date.now(),
): MockAccount => ({
  method: 'password',
  password,
  passwordChangedAt,
  profileCompleted,
  emailVerified: true,
  verificationSentAt: null,
  failedAttempts: 0,
  lockedUntil: null,
});

const providerAccount = (provider: SocialProvider): MockAccount => ({
  method: 'provider',
  provider,
  profileCompleted: true,
  emailVerified: true,
  verificationSentAt: null,
  failedAttempts: 0,
  lockedUntil: null,
});

const accounts = new Map<string, MockAccount>([
  // The design's "Son değişiklik: 3 ay önce" (10.02).
  ['yasemin@example.com', passwordAccount('12345678', true, Date.now() - 92 * DAY_MS)],
  ['deniz@example.com', providerAccount('google')],
  ['ece@example.com', providerAccount('apple')],
]);

let lastResetEmail: string | null = null;
let lastVerificationEmail: string | null = null;

const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
const normalize = (email: string) => email.trim().toLowerCase();
const toSession = (email: string, account: MockAccount): Session => ({
  userId: email,
  email,
  emailVerified: account.emailVerified,
  profileCompleted: account.profileCompleted,
  signInMethod: account.method === 'provider' ? account.provider : 'email',
  passwordChangedAt:
    account.method === 'password' ? new Date(account.passwordChangedAt).toISOString() : undefined,
});

function lockedError(lockedUntil: number) {
  return new AuthError('account-locked', 'Too many failed attempts', {
    lockedUntil: new Date(lockedUntil),
  });
}

export const mockAuthService: AuthService = {
  async lookupEmail(email) {
    await wait();
    const account = accounts.get(normalize(email));
    if (!account) {
      return { status: 'new' };
    }
    return account.method === 'provider'
      ? { status: 'provider', provider: account.provider }
      : { status: 'password' };
  },

  async signIn(email, password) {
    await wait();
    const key = normalize(email);
    const account = accounts.get(key);
    if (!account || account.method !== 'password') {
      throw new AuthError('invalid-credentials', 'Invalid email or password', {});
    }
    if (account.lockedUntil !== null) {
      if (account.lockedUntil > Date.now()) {
        throw lockedError(account.lockedUntil);
      }
      account.lockedUntil = null;
      account.failedAttempts = 0;
    }
    if (account.password !== password) {
      account.failedAttempts += 1;
      if (account.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        account.lockedUntil = Date.now() + LOCK_DURATION_MS;
        throw lockedError(account.lockedUntil);
      }
      throw new AuthError('invalid-credentials', 'Invalid email or password', {
        remainingAttempts: MAX_FAILED_ATTEMPTS - account.failedAttempts,
      });
    }
    account.failedAttempts = 0;
    return toSession(key, account);
  },

  async signUp(email, password) {
    await wait();
    const key = normalize(email);
    if (accounts.has(key)) {
      throw new AuthError('email-in-use', 'Email already registered');
    }
    const account: MockAccount = {
      ...passwordAccount(password, false),
      emailVerified: false,
      verificationSentAt: Date.now(),
    };
    accounts.set(key, account);
    lastVerificationEmail = key;
    return toSession(key, account);
  },

  async signInWithProvider(provider, options) {
    await wait();
    const hinted = options?.emailHint ? normalize(options.emailHint) : null;
    const hintedAccount = hinted ? accounts.get(hinted) : undefined;
    if (hinted && hintedAccount?.method === 'provider' && hintedAccount.provider === provider) {
      return toSession(hinted, hintedAccount);
    }
    const email = `${provider}.user@example.com`;
    let account = accounts.get(email);
    if (!account) {
      account = { ...providerAccount(provider), profileCompleted: false };
      accounts.set(email, account);
    }
    return toSession(email, account);
  },

  async requestPasswordReset(email) {
    await wait();
    lastResetEmail = normalize(email);
  },

  async resetPassword(token, newPassword) {
    await wait();
    if (token === EXPIRED_TOKEN) {
      throw new AuthError('expired-token', 'Reset link expired', {
        email: EXPIRED_TOKEN_EMAIL,
        sentAt: new Date(Date.now() - EXPIRED_TOKEN_AGE_MS),
      });
    }
    if (!token || token === INVALID_TOKEN) {
      throw new AuthError('invalid-token', 'Reset link is invalid');
    }
    const account = lastResetEmail ? accounts.get(lastResetEmail) : undefined;
    if (account?.method === 'password') {
      account.password = newPassword;
      account.passwordChangedAt = Date.now();
      account.failedAttempts = 0;
      account.lockedUntil = null;
    }
  },

  async requestEmailVerification(email) {
    await wait();
    const key = normalize(email);
    const account = accounts.get(key);
    if (account && !account.emailVerified) {
      account.verificationSentAt = Date.now();
      lastVerificationEmail = key;
    }
  },

  async verifyEmail(token) {
    await wait();
    const key = lastVerificationEmail;
    const account = key ? accounts.get(key) : undefined;
    if (token === EXPIRED_TOKEN && key) {
      throw new AuthError('expired-token', 'Verification link expired', {
        email: key,
        sentAt: new Date(Date.now() - EXPIRED_VERIFICATION_AGE_MS),
      });
    }
    if (!token || token === INVALID_TOKEN || !key || !account) {
      throw new AuthError('invalid-token', 'Verification link is invalid');
    }
    account.emailVerified = true;
    account.verificationSentAt = null;
    return toSession(key, account);
  },

  async refreshSession(session) {
    await wait();
    const account = accounts.get(session.userId);
    if (!account) {
      return session;
    }
    // Simulates the user opening the link in their mail app while ROLT was in the background.
    if (
      !account.emailVerified &&
      account.verificationSentAt !== null &&
      Date.now() - account.verificationSentAt >= SIMULATED_LINK_OPEN_DELAY_MS
    ) {
      account.emailVerified = true;
      account.verificationSentAt = null;
    }
    return toSession(session.userId, account);
  },

  async completeProfile(session: Session) {
    await wait();
    const account = accounts.get(session.userId);
    if (account) {
      account.profileCompleted = true;
    }
    return { ...session, profileCompleted: true };
  },

  async changePassword(session, currentPassword, newPassword) {
    await wait();
    const account = accounts.get(normalize(session.email));
    if (!account || account.method !== 'password' || account.password !== currentPassword) {
      throw new AuthError('invalid-credentials', 'Current password is wrong', {});
    }
    account.password = newPassword;
    account.passwordChangedAt = Date.now();
    return toSession(normalize(session.email), account);
  },

  async signOut() {
    await wait();
  },
};
