export type SocialProvider = 'google' | 'apple';

export type Session = {
  userId: string;
  email: string;
  /** False until the registration flow (00.8–00.12) is finished or skipped. */
  profileCompleted: boolean;
};

/**
 * How an email typed on the sign-in screen (00.1 / 00.2) can sign in:
 * - `new`: no account yet → 00.3 "Yeni Hesap" (create a password)
 * - `password`: password account → 00.3 "Mevcut Hesap"
 * - `provider`: account created with Google / Apple → 00.2 "Hesap Google ile bağlı"
 */
export type EmailLookupResult =
  | { status: 'new' }
  | { status: 'password' }
  | { status: 'provider'; provider: SocialProvider };

/** Extra data each error code carries; `undefined` means the code has none. */
export type AuthErrorDetailsMap = {
  /** Wrong email/password. `remainingAttempts` is omitted when the backend doesn't report it. */
  'invalid-credentials': { remainingAttempts?: number };
  /** Too many failed attempts; password sign-in is blocked until `lockedUntil`. */
  'account-locked': { lockedUntil: Date };
  'email-in-use': undefined;
  /** Reset link that never existed, was already used or is malformed. */
  'invalid-token': undefined;
  /** Reset link past its validity window; carries what the "link expired" screen (00.6) shows. */
  'expired-token': { email: string; sentAt: Date };
  network: undefined;
};

export type AuthErrorCode = keyof AuthErrorDetailsMap;

type DetailsArgs<C extends AuthErrorCode> = AuthErrorDetailsMap[C] extends undefined
  ? []
  : [details: AuthErrorDetailsMap[C]];

export class AuthError<C extends AuthErrorCode = AuthErrorCode> extends Error {
  public readonly details: AuthErrorDetailsMap[C];

  constructor(
    public readonly code: C,
    message: string,
    ...details: DetailsArgs<C>
  ) {
    super(message);
    this.name = 'AuthError';
    this.details = details[0] as AuthErrorDetailsMap[C];
  }
}

/** Narrows an unknown error to an `AuthError` with the given code (and its typed `details`). */
export function isAuthError<C extends AuthErrorCode>(error: unknown, code: C): error is AuthError<C> {
  return error instanceof AuthError && error.code === code;
}

export type ProviderSignInOptions = {
  /** Pre-selects the account in the provider's sheet (OAuth `login_hint`), e.g. from 00.2 "Hesap Google ile bağlı". */
  emailHint?: string;
};

/**
 * Backend contract for authentication. The app talks only to this interface;
 * the mock implementation is swapped for self-hosted Supabase later.
 */
export interface AuthService {
  lookupEmail(email: string): Promise<EmailLookupResult>;
  /**
   * Throws `invalid-credentials` (with `remainingAttempts`) on a wrong password and
   * `account-locked` (with `lockedUntil`) once the attempts run out or while locked.
   */
  signIn(email: string, password: string): Promise<Session>;
  signUp(email: string, password: string): Promise<Session>;
  signInWithProvider(provider: SocialProvider, options?: ProviderSignInOptions): Promise<Session>;
  requestPasswordReset(email: string): Promise<void>;
  /** Throws `expired-token` (with `email`, `sentAt`) or `invalid-token`. */
  resetPassword(token: string, newPassword: string): Promise<void>;
  completeProfile(session: Session): Promise<Session>;
  signOut(): Promise<void>;
}
