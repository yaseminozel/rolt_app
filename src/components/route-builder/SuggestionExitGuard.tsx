import { useIsFocused } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform } from 'react-native';

import { SaveDraftDialog } from '@/components/drafts/SaveDraftDialog';
import { closeSuggestRouteFlow } from '@/features/route-suggestion/flowNavigation';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';

const FLOW_STEP_COUNT = 3;
/** iOS: wait for the dialog's fade-out before popping, or the UI can stay untouchable. */
const DIALOG_DISMISS_FALLBACK_MS = 600;

type LeaveIntent = 'save' | 'discard';

/**
 * "Taslak olarak kaydedilsin mi?" (04.x zMCLP) when the rider leaves the "Rota öner" flow.
 *
 * Design decision: mounted on the flow's first screen (04.1) only. Going back between steps is
 * in-flow navigation (the draft lives in the provider), so it never asks; the dialog appears
 * when the flow itself would be closed from 04.1 (header back, swipe, Android back) and the
 * rider has entered anything. Difficulty is pre-filled, so it doesn't count as input.
 */
export function SuggestionExitGuard() {
  const { t } = useTranslation('routeSuggestionDetails');
  const isFocused = useIsFocused();
  const { draft, saveAsDraft } = useRouteSuggestion();
  const [visible, setVisible] = useState(false);
  const [leaveIntent, setLeaveIntent] = useState<LeaveIntent | null>(null);

  const hasInput =
    draft.waypoints.some((waypoint) => waypoint.place !== null) ||
    draft.name.trim().length > 0 ||
    draft.tags.length > 0 ||
    draft.description.trim().length > 0 ||
    draft.photos.length > 0;

  // Only while focused: later steps close the whole flow and must not be stopped by this screen.
  usePreventRemove(isFocused && hasInput && leaveIntent === null, () => {
    Keyboard.dismiss();
    setVisible(true);
  });

  // Runs after the render that lifted the guard, so closing the flow isn't intercepted.
  const leaving = useRef(false);
  useEffect(() => {
    if (!leaveIntent || leaving.current) {
      return;
    }
    leaving.current = true;
    if (leaveIntent === 'save') {
      saveAsDraft();
    }
    closeSuggestRouteFlow();
  }, [leaveIntent, saveAsDraft]);

  const pendingIntent = useRef<LeaveIntent | null>(null);
  const applyPendingIntent = () => {
    if (pendingIntent.current) {
      setLeaveIntent(pendingIntent.current);
      pendingIntent.current = null;
    }
  };
  const leave = (intent: LeaveIntent) => {
    setVisible(false);
    if (Platform.OS === 'ios') {
      pendingIntent.current = intent;
      setTimeout(applyPendingIntent, DIALOG_DISMISS_FALLBACK_MS);
    } else {
      setLeaveIntent(intent);
    }
  };

  const detailsDone = draft.name.trim().length > 0 && draft.tags.length > 0;
  const stepsText = t('exitDialog.steps', {
    done: (draft.preview ? 1 : 0) + (detailsDone ? 1 : 0),
    total: FLOW_STEP_COUNT,
  });
  const meta =
    draft.photos.length > 0
      ? t('exitDialog.summaryMeta', { steps: stepsText, photos: t('exitDialog.photos', { count: draft.photos.length }) })
      : stepsText;

  return (
    <SaveDraftDialog
      visible={visible}
      title={t('exitDialog.title')}
      description={t('exitDialog.description')}
      summary={{ title: draft.name.trim() || t('exitDialog.untitled'), meta, imageUri: draft.photos[0]?.uri }}
      saveLabel={t('exitDialog.save')}
      discardLabel={t('exitDialog.discard')}
      keepEditingLabel={t('exitDialog.keepEditing')}
      onSave={() => leave('save')}
      onDiscard={() => leave('discard')}
      onKeepEditing={() => setVisible(false)}
      onDismiss={applyPendingIntent}
    />
  );
}
