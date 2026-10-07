export type SocialProvider = 'google' | 'apple';

export type Session = {
  userId: string;
  email: string;
  /**
   * False for a new email account until its verification link (02.07) is opened. Google /
   * Apple accounts are verified by the provider. Missing on sessions stored before email
   * verification existed, which count as verified.
   */
  emailVerified?: boolean;
  /** False until the registration flow (04.x) is finished or skipped. */
  profileCompleted: boolean;
};

/**
 * How an email typed on the sign-in screen (02.01) can sign in:
 * - `new`: no account yet → 02.02 "Yeni hesap" (create a password)
 * - `password`: password account → 02.02 "Mevcut hesap"
 * - `provider`: account created with Google / Apple → "Hesap Google ile bağlı"
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
  /** Reset or verification link that never existed, was already used or is malformed. */
  'invalid-token': undefined;
  /** Reset or verification link past its validity window; carries the address it was sent to. */
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
  /** Pre-selects the account in the provider's sheet (OAuth `login_hint`), e.g. from "Hesap Google ile bağlı". */
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
  /** Sends the address verification link (02.07) again. */
  requestEmailVerification(email: string): Promise<void>;
  /**
   * Opens a verification link (`rolt://email-verification/confirm?token=…`) and returns the
   * verified session. Throws `expired-token` (with `email`, `sentAt`) or `invalid-token`.
   */
  verifyEmail(token: string): Promise<Session>;
  /** Re-reads the account, e.g. to see a verification done in another app or device. */
  refreshSession(session: Session): Promise<Session>;
  completeProfile(session: Session): Promise<Session>;
  signOut(): Promise<void>;
}
