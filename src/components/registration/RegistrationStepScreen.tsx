import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { StepProgress } from '@/components/ui/StepProgress';
import { colors, layout, spacing, typography } from '@/theme';

import { HeaderSkipButton } from './HeaderSkipButton';

/** Number of segments in the registration step indicator (00.8–00.11). */
export const REGISTRATION_STEP_COUNT = 4;

/**
 * Content column of the registration frames ("İçerik", padding [20, 32]): the flow uses a
 * 32 pt inset while the pinned CTA keeps the 16 pt screen gutter (see CLAUDE.md decisions).
 */
const CONTENT_INSET = spacing.xxxl;
/** Vertical rhythm between content blocks in UZpFX / QKDo5 / Fv4ol / LreVd (g4Zy4 uses 16). */
const DEFAULT_CONTENT_GAP = 18;

type RegistrationStepScreenProps = {
  /** Filled segments in the step indicator (1–4; 4 on the completion screen). */
  step: number;
  heading: string;
  description: string;
  children: ReactNode;
  ctaLabel: string;
  onCtaPress: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** Shows the "Atla" header action (only on steps where the design enables it). */
  onSkip?: () => void;
  contentGap?: number;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
};

/**
 * Shared scaffold for the registration screens: step indicator, heading and description,
 * scrollable body and a bottom-pinned full-width CTA that stays above the keyboard.
 * The native Stack header ("Hesap oluştur", back) comes from `register/_layout.tsx`.
 */
export function RegistrationStepScreen({
  step,
  heading,
  description,
  children,
  ctaLabel,
  onCtaPress,
  ctaDisabled,
  ctaLoading,
  onSkip,
  contentGap = DEFAULT_CONTENT_GAP,
  scrollRef,
}: RegistrationStepScreenProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  return (
    <>
      {onSkip ? (
        <Stack.Screen options={{ headerRight: () => <HeaderSkipButton onPress={onSkip} /> }} />
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.content, { gap: contentGap }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <StepProgress total={REGISTRATION_STEP_COUNT} current={step} />
          <Text style={styles.heading} accessibilityRole="header">
            {heading}
          </Text>
          <Text style={styles.description}>{description}</Text>
          {children}
        </ScrollView>
        <View
          style={[
            styles.footer,
            { paddingBottom: spacing.md + (keyboardVisible ? 0 : insets.bottom) },
          ]}>
          <Button
            label={ctaLabel}
            onPress={onCtaPress}
            disabled={ctaDisabled}
            loading={ctaLoading}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** Drops the home-indicator inset under the CTA while the keyboard covers it. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: CONTENT_INSET,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  // 14 pt at 1.4 line height.
  description: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textBody,
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
