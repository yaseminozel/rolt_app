import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, layout, spacing, typography } from '@/theme';

const heroImage = require('../../assets/images/onboarding-hero.jpg');

/** "Motion / Splash Blue" (kSZP4): brand-blue layer that fades out to continue the native splash. */
const SPLASH_FADE_MS = 450;
/** Wordmark top below the design's 49 pt status bar (y 72 at a 32 pt line box, same optical center as y 65). */
const WORDMARK_TOP = 23;
const WORDMARK_LINE_HEIGHT = 32;
const WORDMARK_TRACKING = 0.56;
/** "Overlay / Bottom Gradient" (tTI43) covers the lower 560 of 852 pt. */
const GRADIENT_HEIGHT = '66%';
/** Copy block gap (design 11) and copy → CTA gap (design 44). */
const COPY_GAP = 11;
const COPY_TO_ACTION = 44;
/** Body copy 14 pt at 1.64 line height. */
const BODY_LINE_HEIGHT = 23;

const bottomGradient = `linear-gradient(to bottom, ${colors.mediaGradientClear} 0%, ${colors.mediaGradientSoft} 38%, ${colors.mediaGradientMid} 68%, ${colors.mediaGradientStrong} 100%)`;

/** 00.0 Onboarding / Get Started — Pencil `sLkVv`. */
export default function OnboardingScreen() {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { markOnboardingSeen } = useAuth();
  const [splashOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) {
          return;
        }
        if (reduceMotion) {
          splashOpacity.setValue(0);
        } else {
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: SPLASH_FADE_MS,
            useNativeDriver: true,
          }).start();
        }
      });
    return () => {
      cancelled = true;
      splashOpacity.stopAnimation();
    };
  }, [splashOpacity]);

  const handleStart = () => {
    markOnboardingSeen();
    router.replace('/sign-in');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image
        source={heroImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.gradient} />

      <Text style={[styles.wordmark, { top: insets.top + WORDMARK_TOP }]}>{t('wordmark')}</Text>

      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl },
        ]}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t('onboarding.eyebrow')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t('onboarding.title')}
          </Text>
          <Text style={styles.body}>{t('onboarding.body')}</Text>
        </View>
        <Button label={t('onboarding.start')} tone="brand" size="lg" onPress={handleStart} />
      </View>

      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.splash, { opacity: splashOpacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceInverse,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GRADIENT_HEIGHT,
    backgroundImage: bottomGradient,
  },
  wordmark: {
    ...typography.wordmark,
    position: 'absolute',
    alignSelf: 'center',
    lineHeight: WORDMARK_LINE_HEIGHT,
    letterSpacing: WORDMARK_TRACKING,
    color: colors.textInverse,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: COPY_TO_ACTION,
    paddingHorizontal: layout.screenGutter,
  },
  copy: {
    gap: COPY_GAP,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.mediaEyebrow,
  },
  title: {
    ...typography.displayMedium,
    color: colors.textInverse,
  },
  body: {
    ...typography.body,
    lineHeight: BODY_LINE_HEIGHT,
    color: colors.textInverse,
  },
  splash: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
    backgroundColor: colors.brand,
  },
});
