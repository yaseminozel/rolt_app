import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
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

/** Segments in the registration step indicator ("Progress / 1 / 3", 04.01–04.03). */
export const REGISTRATION_STEP_COUNT = 3;

/** Gap between the indicator, the copy and the step body ("Kayıt tamamlama içeriği" gap 32). */
const SECTION_GAP = spacing.xxxl;
/** Description: 14 pt at 1.43. */
const DESCRIPTION_LINE_HEIGHT = 20;

type RegistrationStepScreenProps = {
  /** Filled segments in the step indicator (1–3). */
  step: number;
  heading: string;
  description: string;
  children: ReactNode;
  ctaLabel: string;
  onCtaPress: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** "Atla" under the CTA: leaves the step without saving it. */
  onSkip: () => void;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
};

/**
 * Shared scaffold of the registration steps (Pencil 04.01–04.03): step indicator, heading
 * and description, a scrollable body, and the CTA with "Atla" pinned to the bottom above the
 * keyboard. The native Stack header (back only, no title) comes from `register/_layout.tsx`.
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
  scrollRef,
}: RegistrationStepScreenProps) {
  const { t } = useTranslation('common');
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <StepProgress total={REGISTRATION_STEP_COUNT} current={step} tone="brand" />
        <View style={styles.copy}>
          <Text style={styles.heading} accessibilityRole="header">
            {heading}
          </Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {children}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: spacing.sm + (keyboardVisible ? 0 : insets.bottom) },
        ]}>
        <Button
          label={ctaLabel}
          onPress={onCtaPress}
          disabled={ctaDisabled}
          loading={ctaLoading}
        />
        <Button variant="text" label={t('actions.skip')} onPress={onSkip} disabled={ctaLoading} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Drops the home-indicator inset under the actions while the keyboard covers it. */
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
    gap: SECTION_GAP,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  copy: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.title,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    lineHeight: DESCRIPTION_LINE_HEIGHT,
    color: colors.textPrimary,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
