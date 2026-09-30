import { router, Stack } from 'expo-router';
import { Xmark } from 'iconoir-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResultHeader } from '@/components/feedback/ResultHeader';
import { StatusTimeline } from '@/components/progress/StatusTimeline';
import { RouteStatusCard } from '@/components/route-builder/RouteStatusCard';
import { Button } from '@/components/ui/Button';
import { closeSuggestRouteFlow, useHardwareBack } from '@/features/route-suggestion/flowNavigation';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, layout, spacing } from '@/theme';

/** "Gönderildi" is done, "İnceleniyor" is where the suggestion waits now. */
const REVIEW_STEP_INDEX = 1;

/**
 * 04.5 Başarılı (`xEael`): the suggestion is in review. × and "Keşfete dön" leave the flow;
 * "Başka rota öner" starts a fresh flow. The card shows what was sent even after `reset()`
 * empties the draft (snapshot on mount), so nothing flickers while the screen pops.
 */
export default function SuggestRouteSuccessScreen() {
  const { t } = useTranslation(['routeSuggestionReview', 'common']);
  const insets = useSafeAreaInsets();
  const { draft, lastResult, reset } = useRouteSuggestion();
  const [sent] = useState(() => ({ draft, result: lastResult }));

  useHardwareBack(
    useCallback(() => {
      closeSuggestRouteFlow();
      return true;
    }, []),
  );

  const suggestAnother = () => {
    reset();
    router.dismissTo('/suggest-route');
  };

  const { preview } = sent.draft;
  const meta = [
    preview ? formatDistance(preview.distanceKm) : null,
    preview ? formatDuration(preview.durationMinutes) : null,
    sent.result ? t('success.trackingNo', { id: sent.result.trackingId }) : null,
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
        <ResultHeader tone="success" title={t('success.title')} description={t('success.description')} />
        <RouteStatusCard
          status="inReview"
          statusLabel={t('success.status')}
          geometry={preview?.geometry ?? []}
          title={sent.draft.name}
          meta={meta}>
          <StatusTimeline
            currentIndex={REVIEW_STEP_INDEX}
            steps={[
              { key: 'submitted', label: t('success.timeline.submitted'), caption: t('success.timeline.submittedCaption') },
              { key: 'inReview', label: t('success.timeline.inReview'), caption: t('success.timeline.inReviewCaption') },
              { key: 'published', label: t('success.timeline.published'), caption: t('success.timeline.publishedCaption') },
            ]}
          />
        </RouteStatusCard>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button size="lg" label={t('success.backToDiscover')} onPress={closeSuggestRouteFlow} />
        <Button size="lg" variant="outlined" label={t('success.suggestAnother')} onPress={suggestAnother} />
      </View>
    </View>
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
  footer: {
    gap: 10,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
