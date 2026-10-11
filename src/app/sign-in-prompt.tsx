import { router, useLocalSearchParams } from 'expo-router';
import {
  Bookmark,
  ChatBubbleEmpty,
  Heart,
  LogIn,
  MapsArrowDiagonal,
  Prohibition,
  UserPlus,
  WarningTriangle,
  EditPencil,
} from 'iconoir-react-native';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { AppleMark, GoogleMark } from '@/components/auth/SocialProviderMark';
import { Toast } from '@/components/feedback/Toast';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { clearPendingAccountAction } from '@/features/auth/pendingAccountAction';
import {
  parseSignInPromptReason,
  type SignInPromptReason,
} from '@/features/auth/signInPromptReasons';
import type { SocialProvider } from '@/features/auth/types';
import { useHapticOnSet } from '@/features/haptics/useHapticOnSet';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';

const reasonIcons: Record<SignInPromptReason, ComponentType<SvgProps>> = {
  saveRoute: Bookmark,
  followRider: UserPlus,
  likeRide: Heart,
  commentRide: ChatBubbleEmpty,
  saveRide: Bookmark,
  reportContent: WarningTriangle,
  blockRider: Prohibition,
  suggestRoute: MapsArrowDiagonal,
  sharePost: EditPencil,
};
const GenericIcon = LogIn;

/** Native grabber area + the design's 20 pt section gap and 4 pt inner inset ("Üst" at y 38). */
const SHEET_TOP_INSET = 38;
/** The copy block sits 4 pt inside the actions' edges ("Üst" padding [4, 4, 0, 4]). */
const COPY_INSET = spacing.xs;
const ICON_BADGE_SIZE = 52;
const ICON_SIZE = 24;
/** Title → description gap ("Metin" gap 6). */
const TITLE_GAP = 6;
/** Top block → actions gap ("Alt sayfa" gap 20). */
const SECTION_GAP = spacing.xl;

type PendingAction = SocialProvider | null;

/**
 * 00.15 Misafir / Giriş gerekli — Pencil `ydm6l` ("Alt sayfa / Giriş gerekli"). Native form
 * sheet (fit to contents, grabber, 24 pt corners; see the root layout) shown to guests who hit
 * an account-only action. `reason` picks the icon and copy (see `signInPromptReasons.ts`).
 * Google / Apple turn the guest into a session (the guards route new users to registration);
 * email leaves guest mode so the signed-out stack shows sign-in.
 */
export default function SignInPromptScreen() {
  const { t } = useTranslation('auth');
  const bottomPadding = useSheetBottomPadding((bottom) =>
    Math.max(bottom + spacing.sm, spacing.xxl),
  );
  const { signInWithProvider, leaveGuestMode, markOnboardingSeen } = useAuth();
  const params = useLocalSearchParams<{ reason?: string | string[] }>();
  const reason = parseSignInPromptReason(params.reason);
  const [pending, setPending] = useState<PendingAction>(null);
  /** Set once the guest picks a sign-in method; the pending save is kept only then. */
  const continuingToSignIn = useRef(false);

  // "Şimdi değil" or swiping the sheet away drops the action the guest tried.
  useEffect(
    () => () => {
      if (!continuingToSignIn.current) {
        clearPendingAccountAction();
      }
    },
    [],
  );
  const [error, setError] = useState<string | null>(null);
  useHapticOnSet(error, 'error');

  const Icon = reason ? reasonIcons[reason] : GenericIcon;
  const title = reason
    ? t(`signInPrompt.reasons.${reason}.title`)
    : t('signInPrompt.generic.title');
  const description = reason
    ? t(`signInPrompt.reasons.${reason}.description`)
    : t('signInPrompt.generic.description');

  const handleProvider = async (provider: SocialProvider) => {
    if (pending) {
      return;
    }
    setError(null);
    setPending(provider);
    try {
      // The guest guard drops this sheet once a session exists; `index` routes on.
      continuingToSignIn.current = true;
      await signInWithProvider(provider);
    } catch {
      continuingToSignIn.current = false;
      setError(t('errors.provider', { provider: t(`providers.${provider}`) }));
      setPending(null);
    }
  };

  const handleEmail = () => {
    if (pending) {
      return;
    }
    continuingToSignIn.current = true;
    // Guests only get here after onboarding; marking it again makes `index` land on sign-in, never onboarding.
    markOnboardingSeen();
    leaveGuestMode();
  };

  const handleClose = () => {
    if (!pending) {
      router.back();
    }
  };

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]} testID="sign-in-prompt">
      <View style={styles.top}>
        <View
          style={styles.iconBadge}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} strokeWidth={1.5} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      {error ? <Toast variant="failure" message={error} /> : null}

      <View style={styles.actions}>
        <Button
          variant="outlined"
          label={t('signIn.google')}
          icon={GoogleMark}
          loading={pending === 'google'}
          onPress={() => handleProvider('google')}
        />
        <Button
          variant="outlined"
          label={t('signIn.apple')}
          icon={AppleMark}
          loading={pending === 'apple'}
          onPress={() => handleProvider('apple')}
        />
        <Button label={t('signIn.continueWithEmail')} onPress={handleEmail} />
        <Button
          variant="text"
          label={t('signInPrompt.notNow')}
          onPress={handleClose}
          testID="sign-in-prompt-not-now"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No flex: the `fitToContents` detent measures this view.
  sheet: {
    gap: SECTION_GAP,
    paddingTop: SHEET_TOP_INSET,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  top: {
    gap: spacing.md,
    paddingHorizontal: COPY_INSET,
  },
  iconBadge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSubtle,
  },
  copy: {
    gap: TITLE_GAP,
  },
  title: {
    ...typography.titleSmall,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
  },
});
