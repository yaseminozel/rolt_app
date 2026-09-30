import { router } from 'expo-router';
import { Collapse } from 'iconoir-react-native';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { ProgressChecklist, type ProgressChecklistItem } from '@/components/progress/ProgressChecklist';
import { RouteStatusCard } from '@/components/route-builder/RouteStatusCard';
import { Button } from '@/components/ui/Button';
import { closeSuggestRouteFlow, useHardwareBack } from '@/features/route-suggestion/flowNavigation';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { SubmissionError } from '@/features/route-suggestion/services';
import { sendSubmissionToBackground, startSubmission } from '@/features/route-suggestion/submissionRunner';
import type { SubmissionStep } from '@/features/route-suggestion/types';
import { formatDistance, formatDuration, formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, spacing, typography } from '@/theme';

const STEPS: readonly SubmissionStep[] = ['validateLine', 'uploadDetails', 'uploadPhotos', 'sendToReview'];
const MAP_HEIGHT = 150;

/**
 * 04.4 Gönderiliyor (`r45pE`). Starts the submission on mount through the module-level runner
 * (`startSubmission` returns the run already in flight, so a remount never sends twice) and
 * mirrors its progress. Success → 04.5, failure → the draft is saved and 04.6 shows the code.
 * "Arka planda devam et" hands the run to the background and closes the flow; the outcome
 * arrives as a toast. There is no way back from here while sending.
 */
export default function SuggestRouteSendingScreen() {
  const { t } = useTranslation(['routeSuggestionReview', 'routes']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { draft, draftId, saveAsDraft, setLastResult } = useRouteSuggestion();
  const [run] = useState(() => startSubmission(draft, draftId));
  const state = useSyncExternalStore(run.subscribe, run.getState);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || run.inBackground || state.status === 'running') {
      return;
    }
    handled.current = true;
    if (state.status === 'succeeded') {
      setLastResult(state.result);
      router.replace('/suggest-route/success');
      return;
    }
    saveAsDraft();
    const { error } = state;
    router.replace({
      pathname: '/suggest-route/failed',
      params:
        error instanceof SubmissionError
          ? { code: error.code, reason: error.reason }
          : { reason: 'server' },
    });
  }, [run, state, saveAsDraft, setLastResult]);

  // Android back must not abandon an upload in progress; the explicit CTA is the way out.
  useHardwareBack(useCallback(() => true, []));

  const continueInBackground = () => {
    // Once settled, the effect above is already moving on to the result screen.
    if (run.getState().status !== 'running') {
      return;
    }
    sendSubmissionToBackground(run, (settled) =>
      showToast(
        settled.status === 'succeeded'
          ? { variant: 'success', message: t('sending.backgroundSuccessToast') }
          : { variant: 'failure', message: t('sending.backgroundFailureToast') },
      ),
    );
    closeSuggestRouteFlow();
  };

  const { progress } = state;
  const fraction = state.status === 'succeeded' ? 1 : (progress?.fraction ?? 0);
  const photoTotal = progress?.totalPhotos ?? run.draft.photos.length;
  const currentIndex = state.status === 'succeeded' ? STEPS.length : STEPS.indexOf(progress?.step ?? STEPS[0]);

  const items: ProgressChecklistItem[] = STEPS.flatMap((step, index) => {
    // Photos are optional; without any, the step would only flash by.
    if (step === 'uploadPhotos' && photoTotal === 0) {
      return [];
    }
    const itemState = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
    const showsCount = step === 'uploadPhotos' && itemState === 'active';
    const counts = {
      uploaded: formatNumber(progress?.uploadedPhotos ?? 0),
      total: formatNumber(photoTotal),
    };
    return [
      {
        key: step,
        label: t(`sending.steps.${step}.${itemState}`),
        state: itemState,
        count: showsCount ? t('sending.photoProgress', counts) : undefined,
        accessibilityLabel: showsCount
          ? `${t(`sending.steps.${step}.${itemState}`)}, ${t('sending.photoProgressA11y', counts)}`
          : undefined,
      },
    ];
  });

  const { preview, tags } = run.draft;
  const meta = [
    preview ? formatDistance(preview.distanceKm) : null,
    preview ? formatDuration(preview.durationMinutes) : null,
    tags.length > 0 ? tags.map((tag) => t(`routes:tags.${tag}`)).join(t('tagSeparator')) : null,
  ]
    .filter(Boolean)
    .join(t('listSeparator'));

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">
            {t('sending.title')}
          </Text>
          <Text style={styles.description}>{t('sending.description')}</Text>
        </View>
        <RouteStatusCard
          status="sending"
          statusLabel={t('sending.status')}
          geometry={preview?.geometry ?? []}
          mapHeight={MAP_HEIGHT}
          title={run.draft.name}
          meta={meta}
          progress={{
            fraction,
            label: formatNumber(fraction, { style: 'percent', maximumFractionDigits: 0 }),
            accessibilityLabel: t('sending.progressA11y'),
          }}
        />
        <ProgressChecklist items={items} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button
          size="lg"
          variant="outlined"
          icon={Collapse}
          label={t('sending.continueInBackground')}
          onPress={continueInBackground}
        />
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
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  intro: {
    gap: 6,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
