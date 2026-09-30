import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { ChoiceChipGroup, type ChoiceChipOption } from '@/components/form/ChoiceChipGroup';
import { FormSection } from '@/components/form/FormSection';
import { PhotoPickerGrid, type PhotoPickerGridLabels } from '@/components/media/PhotoPickerGrid';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StepProgress } from '@/components/ui/StepProgress';
import { TextField } from '@/components/ui/TextField';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_SUGGESTION_PHOTOS,
  MAX_SUGGESTION_TAGS,
} from '@/features/route-suggestion/types';
import type { RouteDifficulty, RouteTag } from '@/features/routes/types';
import { colors, layout, spacing, typography } from '@/theme';

/** "Rota türü" chips in the design's order (`ldcdM`); labels from `routes:tags.*`. */
const TAG_ORDER: readonly RouteTag[] = ['coast', 'scenic', 'curvy', 'nature', 'city', 'offRoad', 'longTour'];
const DEFAULT_DIFFICULTY: RouteDifficulty = 'moderate';
const FLOW_STEP_COUNT = 3;
const DETAILS_STEP = 2;
/** Not in the design: keeps names on one line in cards and the draft summary. */
const MAX_NAME_LENGTH = 80;
/** Content column inset ("İçerik" padding [20, 32]); the pinned CTA keeps the 16 pt gutter. */
const CONTENT_INSET = spacing.xxxl;
/** Space kept above a field when scrolling to the first error. */
const ERROR_SCROLL_MARGIN = spacing.lg;
/** Fallback if iOS never reports the dialog as dismissed (fade-out is ~300 ms). */


/**
 * 04.2 Rota öner / Rota bilgileri (Pencil `ldcdM`; errors and uploads `fGq4D`; exit `zMCLP`).
 *
 * Validation: name (trimmed) and at least one route type are required; difficulty always has
 * a value (defaults to "Orta"); description and photos are optional. "Önizlemeye geç" stays
 * enabled while fields are missing — pressing it reveals the inline errors and scrolls to the
 * first one; errors then update live. It is disabled only while a photo is uploading or any
 * upload failed (retry or remove it first).
 *
 * Back returns to 04.1 with everything kept (the draft lives in the provider); the
 * "Taslak olarak kaydedilsin mi?" dialog (zMCLP) guards leaving the flow, on 04.1
 * (`SuggestionExitGuard`).
 */
export default function SuggestRouteDetailsScreen() {
  const { t } = useTranslation(['routeSuggestionDetails', 'routes']);
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { draft, updateDetails, retryPhoto, removePhoto, setCoverPhoto } = useRouteSuggestion();

  const [showErrors, setShowErrors] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef({ name: 0, tags: 0 });

  // Segmented control cannot show "nothing selected" (CLAUDE.md: middle option by default).
  useEffect(() => {
    if (draft.difficulty === null) {
      updateDetails({ difficulty: DEFAULT_DIFFICULTY });
    }
  }, [draft.difficulty, updateDetails]);

  const nameMissing = draft.name.trim().length === 0;
  const tagsMissing = draft.tags.length === 0;
  const hasUploading = draft.photos.some((photo) => photo.uploadStatus === 'uploading');
  const failedCount = draft.photos.filter((photo) => photo.uploadStatus === 'failed').length;
  const ctaDisabled = hasUploading || failedCount > 0;

  const handleContinue = () => {
    if (nameMissing || tagsMissing) {
      setShowErrors(true);
      const target = nameMissing ? sectionOffsets.current.name : sectionOffsets.current.tags;
      scrollRef.current?.scrollTo({ y: Math.max(0, target - ERROR_SCROLL_MARGIN), animated: true });
      return;
    }
    const trimmedName = draft.name.trim();
    if (trimmedName !== draft.name) {
      updateDetails({ name: trimmedName });
    }
    router.push('/suggest-route/preview');
  };

  const tagOptions = useMemo<ChoiceChipOption<RouteTag>[]>(
    () => TAG_ORDER.map((tag) => ({ value: tag, label: t(`routes:tags.${tag}`) })),
    [t],
  );

  const difficultyOptions = [
    { value: 'easy', label: t('routes:difficulty.easy') },
    { value: 'moderate', label: t('routes:difficulty.moderate') },
    { value: 'hard', label: t('routes:difficulty.hard') },
  ] as const;

  const photoLabels = useMemo<PhotoPickerGridLabels>(
    () => ({
      add: t('photos.add'),
      addA11y: t('photos.addA11y'),
      cover: t('photos.cover'),
      retry: t('photos.retry'),
      photoA11y: (index) => t('photos.photoA11y', { index }),
      coverA11y: (index) => t('photos.coverA11y', { index }),
      uploadingA11y: (index) => t('photos.uploadingA11y', { index }),
      failedA11y: (index) => t('photos.failedA11y', { index }),
      setCover: t('photos.menu.setCover'),
      remove: t('photos.menu.remove'),
      cancel: t('photos.menu.cancel'),
    }),
    [t],
  );

  const photoTiles = useMemo(
    () => draft.photos.map((photo) => ({ id: photo.id, uri: photo.uri, status: photo.uploadStatus })),
    [draft.photos],
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <StepProgress total={FLOW_STEP_COUNT} current={DETAILS_STEP} />
        <Text style={styles.heading} accessibilityRole="header">
          {t('heading')}
        </Text>
        <Text style={styles.description}>{t('description')}</Text>

        <View
          onLayout={(event) => {
            sectionOffsets.current.name = event.nativeEvent.layout.y;
          }}>
          <TextField
            label={t('name.label')}
            placeholder={t('name.placeholder')}
            value={draft.name}
            onChangeText={(name) => updateDetails({ name })}
            errorText={showErrors && nameMissing ? t('name.required') : undefined}
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </View>

        <View
          onLayout={(event) => {
            sectionOffsets.current.tags = event.nativeEvent.layout.y;
          }}>
          <ChoiceChipGroup
            label={t('tags.label')}
            options={tagOptions}
            value={draft.tags}
            onChange={(tags) => updateDetails({ tags })}
            max={MAX_SUGGESTION_TAGS}
            hint={t('tags.max', { count: MAX_SUGGESTION_TAGS })}
            errorText={showErrors && tagsMissing ? t('tags.required') : undefined}
          />
        </View>

        <FormSection label={t('difficulty.label')}>
          <SegmentedControl
            options={difficultyOptions}
            value={draft.difficulty ?? DEFAULT_DIFFICULTY}
            onChange={(difficulty) => updateDetails({ difficulty })}
            accessibilityLabel={t('difficulty.label')}
          />
        </FormSection>

        <TextField
          type="multiline"
          label={t('notes.label')}
          placeholder={t('notes.placeholder')}
          value={draft.description}
          onChangeText={(description) => updateDetails({ description })}
          maxLength={MAX_DESCRIPTION_LENGTH}
          autoCapitalize="sentences"
        />

        <FormSection
          label={t('photos.label')}
          hint={t('photos.counter', { count: draft.photos.length, max: MAX_SUGGESTION_PHOTOS })}
          errorText={failedCount > 0 ? t('photos.failed', { count: failedCount }) : undefined}>
          <PhotoPickerGrid
            photos={photoTiles}
            labels={photoLabels}
            max={MAX_SUGGESTION_PHOTOS}
            onAdd={() => router.push('/suggest-route/add-photos')}
            onRetry={retryPhoto}
            onRemove={removePhoto}
            onSetCover={setCoverPhoto}
          />
        </FormSection>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + (keyboardVisible ? 0 : insets.bottom) }]}>
        <Button label={t('cta')} onPress={handleContinue} disabled={ctaDisabled} size="lg" />
      </View>

    </KeyboardAvoidingView>
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
    gap: spacing.lg,
    paddingHorizontal: CONTENT_INSET,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textBody,
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
