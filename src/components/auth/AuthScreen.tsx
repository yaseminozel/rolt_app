import { router, type Href } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/feedback/Toast';
import { useHapticOnSet } from '@/features/haptics/useHapticOnSet';
import { colors, layout, spacing, typography } from '@/theme';

export type AuthScreenProps = {
  title: string;
  subtitle?: string;
  /**
   * Failure that no single field owns (network, provider, expired link). Shown as an
   * inline failure toast between the copy and the form.
   */
  errorMessage?: string | null;
  /** Terms / privacy consent line pinned to the bottom; only the sign-in and password steps (02.01–02.02) show it. */
  showLegalFooter?: boolean;
  /** Artwork above the title, 32 pt over the copy (02.07 "Süresi dolmuş bağlantı"). */
  illustration?: ReactNode;
  children?: ReactNode;
};

/** Wordmark top, measured from the bottom of the design's 49 pt status bar (y 101 in 02.01–02.07). */
const WORDMARK_TOP = 52;
/** Wordmark bottom (y 133) to title (y 185) in every auth frame. */
const WORDMARK_TO_TITLE = 52;
/** Design wordmark metrics: 28 pt Bakbak One at 1.1428 line height, 2 % tracking. */
const WORDMARK_LINE_HEIGHT = 32;
const WORDMARK_TRACKING = 0.56;

/**
 * Shared layout of the auth flow (Pencil 02.01–02.07): ROLT wordmark, optional illustration,
 * title and optional subtitle, the screen's form, and on the
 * sign-in steps the legal footer pinned to the bottom.
 * Scrolls with the keyboard open and clears the transparent native header on the
 * screens that have one.
 */
export function AuthScreen({
  title,
  subtitle,
  errorMessage,
  showLegalFooter = false,
  illustration,
  children,
}: AuthScreenProps) {
  useHapticOnSet(errorMessage, 'error');
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation('auth');

  // Same wordmark position on every step; never under the back-button header.
  const paddingTop = Math.max(insets.top + WORDMARK_TOP, headerHeight + spacing.sm);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.content,
            { paddingTop, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.wordmark}>{t('wordmark')}</Text>

          {illustration ? <View style={styles.illustration}>{illustration}</View> : null}

          <View style={[styles.copy, illustration ? styles.copyBelowIllustration : null]}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {errorMessage ? (
            <Toast variant="failure" message={errorMessage} style={styles.error} />
          ) : null}

          <View style={styles.form}>{children}</View>

          {showLegalFooter ? (
            <Text style={styles.legal}>
              <Trans
                t={t}
                i18nKey="legalFooter"
                components={{
                  terms: <LegalLink href="/legal/terms" />,
                  privacy: <LegalLink href="/legal/privacy" />,
                }}
              />
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type LegalLinkProps = {
  href: Href;
  /** Injected by `<Trans>` from the translation markup. */
  children?: ReactNode;
};

function LegalLink({ href, children }: LegalLinkProps) {
  return (
    <Text accessibilityRole="link" onPress={() => router.push(href)} style={styles.link}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenGutter,
  },
  wordmark: {
    ...typography.wordmark,
    lineHeight: WORDMARK_LINE_HEIGHT,
    letterSpacing: WORDMARK_TRACKING,
    color: colors.brand,
    alignSelf: 'flex-start',
  },
  illustration: {
    marginTop: WORDMARK_TO_TITLE,
  },
  copy: {
    marginTop: WORDMARK_TO_TITLE,
    gap: spacing.sm,
  },
  copyBelowIllustration: {
    marginTop: spacing.xxxl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
  },
  error: {
    marginTop: spacing.xxl,
  },
  form: {
    marginTop: spacing.xxxl,
  },
  // Pinned to the bottom when the content is short; follows the form when it scrolls.
  legal: {
    ...typography.caption,
    marginTop: 'auto',
    paddingTop: spacing.xxl,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  link: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
