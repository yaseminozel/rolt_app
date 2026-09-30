export type SocialProvider = 'google' | 'apple';

export type Session = {
  userId: string;
  email: string;
  /** False until the registration flow (00.8–00.12) is finished or skipped. */
  profileCompleted: boolean;
};

/** Result of checking an email on the sign-in screen: decides 00.3 "Mevcut Hesap" vs "Yeni Hesap". */
export type EmailLookupResult = 'existing' | 'new';

export class AuthError extends Error {
  constructor(
    public readonly code: 'invalid-credentials' | 'email-in-use' | 'invalid-token' | 'network',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Backend contract for authentication. The app talks only to this interface;
 * the mock implementation is swapped for self-hosted Supabase later.
 */
export interface AuthService {
  lookupEmail(email: string): Promise<EmailLookupResult>;
  signIn(email: string, password: string): Promise<Session>;
  signUp(email: string, password: string): Promise<Session>;
  signInWithProvider(provider: SocialProvider): Promise<Session>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  completeProfile(session: Session): Promise<Session>;
  signOut(): Promise<void>;
}
