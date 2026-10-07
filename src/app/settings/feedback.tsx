import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { PhotoPickerGrid } from '@/components/media/PhotoPickerGrid';
import { UploadBox } from '@/components/media/UploadBox';
import { SelectField } from '@/components/ride-form/SelectField';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { FEEDBACK_TOPICS, sendFeedback, type FeedbackTopic } from '@/features/settings/feedback';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, spacing, typography } from '@/theme';

const MESSAGE_MAX = 280;
const SCREENSHOTS_MAX = 3;

/**
 * 10.13 Geri bildirim gönder (Pencil `DWydQ`): topic, description and up to three screenshots;
 * the app version and device are attached. The topic list isn't drawn: Hata bildirimi, Özellik
 * önerisi, Rota veya harita sorunu, Diğer in a native action sheet. There is no error log to
 * attach yet, so the note mentions only the version and device.
 */
export default function FeedbackScreen() {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [topic, setTopic] = useState<FeedbackTopic>('bug');
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<{ id: string; uri: string }[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const chooseTopic = () =>
    showActionSheet({
      title: t('feedbackPage.topicSheetTitle'),
      cancelLabel: t('feedbackPage.cancel'),
      options: FEEDBACK_TOPICS.map((option) => ({
        label: t(`feedbackPage.topics.${option}`),
        onPress: () => setTopic(option),
      })),
    });

  const addScreenshots = async () => {
    const room = SCREENSHOTS_MAX - screenshots.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.7,
    });
    if (!result.canceled) {
      setScreenshots((current) => [
        ...current,
        ...result.assets
          .slice(0, room)
          .map((asset) => ({ id: asset.assetId ?? asset.uri, uri: asset.uri })),
      ]);
    }
  };

  const send = async () => {
    if (!message.trim()) {
      setError(t('feedbackPage.messageRequired'));
      return;
    }
    setSending(true);
    try {
      await sendFeedback({
        topic,
        message: message.trim(),
        screenshotUris: screenshots.map((item) => item.uri),
      });
      showToast({ variant: 'success', message: t('feedbackPage.sent') });
      router.back();
    } catch {
      showToast({ variant: 'failure', message: t('feedbackPage.failed') });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('feedbackPage.title') }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>{t('feedbackPage.description')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('feedbackPage.topic')}</Text>
            <SelectField
              value={t(`feedbackPage.topics.${topic}`)}
              accessibilityLabel={t('feedbackPage.topic')}
              onPress={chooseTopic}
            />
          </View>

          <TextField
            type="multiline"
            label={t('feedbackPage.message')}
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              setError(undefined);
            }}
            placeholder={t('feedbackPage.messagePlaceholder')}
            maxLength={MESSAGE_MAX}
            errorText={error}
          />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('feedbackPage.screenshots')}</Text>
              <Text style={styles.counter}>{`${screenshots.length}/${SCREENSHOTS_MAX}`}</Text>
            </View>
            {screenshots.length === 0 ? (
              <UploadBox
                title={t('feedbackPage.addScreenshot')}
                hint={t('feedbackPage.addScreenshotHint')}
                onPress={addScreenshots}
              />
            ) : (
              <PhotoPickerGrid
                photos={screenshots}
                max={SCREENSHOTS_MAX}
                showCover={false}
                onAdd={addScreenshots}
                onRemove={(id) =>
                  setScreenshots((current) => current.filter((item) => item.id !== id))
                }
                labels={{
                  add: t('feedbackPage.addScreenshot'),
                  addA11y: t('feedbackPage.addScreenshot'),
                  cover: '',
                  retry: '',
                  photoA11y: (index) => t('feedbackPage.screenshotA11y', { index }),
                  coverA11y: (index) => t('feedbackPage.screenshotA11y', { index }),
                  uploadingA11y: (index) => t('feedbackPage.screenshotA11y', { index }),
                  failedA11y: (index) => t('feedbackPage.screenshotA11y', { index }),
                  setCover: '',
                  remove: t('feedbackPage.remove'),
                  cancel: t('feedbackPage.cancel'),
                }}
              />
            )}
          </View>

          <Text style={styles.note}>{t('feedbackPage.note')}</Text>
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button size="lg" label={t('feedbackPage.send')} onPress={send} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  counter: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  note: {
    ...typography.caption,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
