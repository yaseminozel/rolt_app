import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavArrowLeft } from 'iconoir-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
// The gesture-handler ScrollView lets the illustrations' vertical drags take over from paging.
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  OnboardingIllustration,
  type OnboardingIllustrationKey,
} from '@/components/onboarding/OnboardingIllustration';
import { Button } from '@/components/ui/Button';
import { trackEvent } from '@/features/analytics/track';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, layout, radius, spacing, typography } from '@/theme';

/** Pages in order; each draws its animated "Görsel" frame (393 × 520). */
const pages: readonly OnboardingIllustrationKey[] = ['discover', 'record', 'share'];

const LAST_PAGE = pages.length - 1;
/** Illustration frame size; it fills the width and keeps this ratio unless the screen is short. */
const ILLUSTRATION_ASPECT = 393 / 520;
/** Illustration bottom (y 520) → page indicator (y 528). */
const INDICATOR_TOP = 8;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 20;
const DOT_GAP = 6;
/** Indicator top → title (20 below the 8 pt dots). */
const COPY_TOP = INDICATOR_TOP + DOT_SIZE + spacing.xl;
/** Title (2 lines) + 10 + body (2 lines): "Metin" 114 pt tall. */
const COPY_HEIGHT = 114;
const TITLE_TO_BODY = 10;
/** "Atla" sits 8 pt below the status bar. */
const SKIP_TOP = spacing.sm;
/** Back + primary action row, 12 pt apart. */
const ACTION_GAP = spacing.md;
/** Space kept between the copy and the action row on short screens. */
const MIN_COPY_TO_ACTIONS = spacing.xxl;

/**
 * 01.01–01.03 Onboarding — Pencil `EAG9T` (Keşfet), `l3qzJM` (Sür ve kaydet), `bblG8` (Paylaş).
 * Shown once after the splash (note `YMpU5`); replaces the old Get Started screen. Pages move
 * by swiping or "Devam et"; "Atla" (pages 1–2), "Hemen başla" and "Giriş yap" all lead to
 * sign-in. No permission is requested here: the pages only prepare the reasons (note `OcoKg`).
 */
export default function OnboardingScreen() {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { markOnboardingSeen } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const isLast = pageIndex === LAST_PAGE;

  useEffect(() => {
    trackEvent('onboarding_page_view', { page: pageIndex + 1 });
  }, [pageIndex]);

  // Tallest footer (last page: actions + "Giriş yap" row) so the copy never slides under it.
  const footerHeight = layout.minTouchTarget * 2 + spacing.sm + spacing.xs + insets.bottom;
  const reservedBelowIllustration = COPY_TOP + COPY_HEIGHT + MIN_COPY_TO_ACTIONS + footerHeight;
  const illustrationHeight = Math.min(
    width / ILLUSTRATION_ASPECT,
    height - reservedBelowIllustration,
  );

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPageIndex(index);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPageIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const leave = () => {
    markOnboardingSeen();
    router.replace('/sign-in');
  };

  const handleSkip = () => {
    trackEvent('onboarding_skip', { page: pageIndex + 1 });
    leave();
  };

  const handleStart = () => {
    trackEvent('onboarding_start');
    leave();
  };

  const handleSignIn = () => {
    trackEvent('onboarding_login_tap');
    leave();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentInsetAdjustmentBehavior="never">
        {pages.map((page, index) => (
          <View key={page} style={{ width }}>
            <OnboardingIllustration
              page={page}
              active={index === pageIndex}
              width={width}
              height={illustrationHeight}
            />
            <View style={styles.copy}>
              <Text style={styles.title} accessibilityRole="header">
                {t(`onboarding.pages.${page}.title`)}
              </Text>
              <Text style={styles.body}>{t(`onboarding.pages.${page}.body`)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[styles.indicator, { top: illustrationHeight + INDICATOR_TOP }]}
        accessibilityRole="progressbar"
        accessibilityLabel={t('onboarding.pageA11y', { page: pageIndex + 1, total: pages.length })}>
        {pages.map((page, index) => (
          <View key={page} style={[styles.dot, index === pageIndex && styles.dotActive]} />
        ))}
      </View>

      {isLast ? null : (
        <Button
          variant="text"
          label={t('onboarding.skip')}
          onPress={handleSkip}
          style={[styles.skip, { top: insets.top + SKIP_TOP }]}
        />
      )}

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + (isLast ? spacing.xs : spacing.lg) },
        ]}>
        <View style={styles.actions}>
          {pageIndex > 0 ? (
            <Button
              variant="outlined"
              icon={NavArrowLeft}
              accessibilityLabel={t('onboarding.back')}
              onPress={() => goToPage(pageIndex - 1)}
              style={styles.back}
            />
          ) : null}
          <Button
            label={isLast ? t('onboarding.start') : t('onboarding.next')}
            onPress={isLast ? handleStart : () => goToPage(pageIndex + 1)}
            style={styles.primary}
          />
        </View>
        {isLast ? (
          <Pressable
            onPress={handleSignIn}
            accessibilityRole="link"
            style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}>
            <Text style={styles.signInText}>
              {t('onboarding.haveAccount')}{' '}
              <Text style={styles.signInLink}>{t('onboarding.signIn')}</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  copy: {
    marginTop: COPY_TOP,
    gap: TITLE_TO_BODY,
    paddingHorizontal: layout.screenGutter,
  },
  title: {
    ...typography.onboardingTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: DOT_ACTIVE_WIDTH,
    backgroundColor: colors.brand,
  },
  skip: {
    position: 'absolute',
    right: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingHorizontal: layout.screenGutter,
  },
  actions: {
    flexDirection: 'row',
    gap: ACTION_GAP,
  },
  back: {
    width: layout.minTouchTarget,
    paddingHorizontal: 0,
  },
  primary: {
    flex: 1,
  },
  signIn: {
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  signInPressed: {
    backgroundColor: colors.surfacePressed,
  },
  signInText: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
  },
  signInLink: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
