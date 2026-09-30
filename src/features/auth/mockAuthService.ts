import { AuthError, type AuthService, type Session } from './types';

/**
 * In-memory AuthService used until the Supabase integration.
 * `yasemin@example.com` (the design's sample account) is pre-registered with password `12345678`;
 * any other email is treated as a new account. Delays make loading states visible.
 */
const NETWORK_DELAY_MS = 800;

const accounts = new Map<string, { password: string; profileCompleted: boolean }>([
  ['yasemin@example.com', { password: '12345678', profileCompleted: true }],
]);

const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
const normalize = (email: string) => email.trim().toLowerCase();

export const mockAuthService: AuthService = {
  async lookupEmail(email) {
    await wait();
    return accounts.has(normalize(email)) ? 'existing' : 'new';
  },

  async signIn(email, password) {
    await wait();
    const key = normalize(email);
    const account = accounts.get(key);
    if (!account || account.password !== password) {
      throw new AuthError('invalid-credentials', 'Invalid email or password');
    }
    return { userId: key, email: key, profileCompleted: account.profileCompleted };
  },

  async signUp(email, password) {
    await wait();
    const key = normalize(email);
    if (accounts.has(key)) {
      throw new AuthError('email-in-use', 'Email already registered');
    }
    accounts.set(key, { password, profileCompleted: false });
    return { userId: key, email: key, profileCompleted: false };
  },

  async signInWithProvider(provider) {
    await wait();
    const email = `${provider}.user@example.com`;
    const account = accounts.get(email);
    return { userId: email, email, profileCompleted: account?.profileCompleted ?? false };
  },

  async requestPasswordReset() {
    await wait();
  },

  async resetPassword(token) {
    await wait();
    if (!token) {
      throw new AuthError('invalid-token', 'Reset link is invalid or expired');
    }
  },

  async completeProfile(session: Session) {
    await wait();
    const account = accounts.get(session.userId);
    if (account) {
      account.profileCompleted = true;
    }
    return { ...session, profileCompleted: true };
  },

  async signOut() {
    await wait();
  },
};
