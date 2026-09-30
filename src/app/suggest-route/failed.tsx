import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Refresh, Wifi, Xmark } from 'iconoir-react-native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResultHeader } from '@/components/feedback/ResultHeader';
import { RouteStatusCard, RouteStatusCardErrorRow } from '@/components/route-builder/RouteStatusCard';
import { Button } from '@/components/ui/Button';
import { closeSuggestRouteFlow, useHardwareBack } from '@/features/route-suggestion/flowNavigation';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import type { SubmissionError } from '@/features/route-suggestion/services';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, layout, spacing, typography } from '@/theme';

type FailedParams = {
  /** `SubmissionError.code`, e.g. "RT-503"; absent for unexpected errors. */
  code?: string;
  reason?: SubmissionError['reason'];
};

/**
 * 04.6 Hatalı (`s0dDZ`): sending failed and the draft is already saved on the device.
 * "Yeniden dene" sends again; "Taslağa dön ve düzenle" goes back to the details step with the
 * same draft; × leaves the flow (the draft stays in "Taslaklar").
 *
 * Auto-retry: no connectivity library is installed, so "bağlantın geri geldiğinde" is
 * approximated by the app returning from the background to the foreground (the user usually
 * leaves to fix the connection) — only for network failures and only while this screen is
 * focused. With `EXPO_PUBLIC_MOCK_SUBMISSION=fail` every foreground return fails again.
 */
export default function SuggestRouteFailedScreen() {
  const { t } = useTranslation(['routeSuggestionReview', 'common']);
  const insets = useSafeAreaInsets();
  const { code, reason = 'network' } = useLocalSearchParams<FailedParams>();
  const { draft } = useRouteSuggestion();
  const isNetwork = reason === 'network';

  const retry = useCallback(() => router.replace('/suggest-route/sending'), []);
  useAutoRetryOnForeground(isNetwork, retry);

  useHardwareBack(
    useCallback(() => {
      closeSuggestRouteFlow();
      return true;
    }, []),
  );

  const { preview } = draft;
  const photoCount = draft.photos.length;
  const meta = [
    preview ? formatDistance(preview.distanceKm) : null,
    preview ? formatDuration(preview.durationMinutes) : null,
    photoCount > 0 ? t('photoCount', { count: photoCount }) : null,
  ]
    .filter(Boolean)
    .join(t('listSeparator'));

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={closeSuggestRouteFlow}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.close')}
              hitSlop={spacing.xs}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Xmark width={22} height={22} color={colors.textPrimary} strokeWidth={1.8} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ResultHeader
          tone="error"
          title={t('failed.title')}
          description={isNetwork ? t('failed.descriptionNetwork') : t('failed.descriptionServer')}
        />
        <RouteStatusCard
          status="draftSaved"
          statusLabel={t('failed.status')}
          geometry={preview?.geometry ?? []}
          title={draft.name}
          meta={meta}
          footer={<RouteStatusCardErrorRow message={t('failed.errorRow')} code={code || undefined} />}
        />
        {isNetwork ? (
          <View style={styles.note}>
            <Wifi width={14} height={14} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.noteText}>{t('failed.autoRetryNote')}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button size="lg" icon={Refresh} label={t('failed.retry')} onPress={retry} />
        <Button
          size="lg"
          variant="outlined"
          label={t('failed.backToDraft')}
          onPress={() => router.dismissTo('/suggest-route/details')}
        />
      </View>
    </View>
  );
}

/** Calls `retry` when the app comes back from the background while this screen is focused. */
function useAutoRetryOnForeground(enabled: boolean, retry: () => void) {
  // Set on 'background', consumed on 'active': covers iOS's background → inactive → active and
  // ignores inactive → active blips (notification centre, system alerts).
  const wentToBackground = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return undefined;
      }
      wentToBackground.current = false;
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'background') {
          wentToBackground.current = true;
        } else if (next === 'active' && wentToBackground.current) {
          wentToBackground.current = false;
          retry();
        }
      });
      return () => subscription.remove();
    }, [enabled, retry]),
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.minTouchTarget / 2,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  noteText: {
    flexShrink: 1,
    ...typography.caption,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  footer: {
    gap: 10,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
