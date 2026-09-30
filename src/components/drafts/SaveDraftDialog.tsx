import { Image } from 'expo-image';
import { Map as MapIcon, PageEdit } from 'iconoir-react-native';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type SaveDraftDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  /** What will be kept: cover photo (optional), name and a progress line. */
  summary: { title: string; meta: string; imageUri?: string };
  saveLabel: string;
  discardLabel: string;
  keepEditingLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  /** Also called for the Android back button while the dialog is open. */
  onKeepEditing: () => void;
  /** iOS: the modal finished hiding (navigate away only after this, see RN `Modal.onDismiss`). */
  onDismiss?: () => void;
};

const MAX_CARD_WIDTH = 337;
/** 28 pt from each screen edge on the 393 pt frame. */
const SCREEN_MARGIN = 28;
const ICON_DISC_SIZE = 56;
const ICON_SIZE = 26;
const THUMB_SIZE = 40;
const PLACEHOLDER_ICON_SIZE = 20;
/** Title → description gap ("Metin" gap 6). */
const TEXT_GAP = 6;
/** Summary row padding and gap ("Özet" padding 10, gap 10). */
const SUMMARY_INSET = 10;

/**
 * "Taslak olarak kaydedilsin mi?" (Pencil `zMCLP`, "Diyalog / Taslak kaydet"): shown when the
 * rider leaves a creation flow with unsaved input. Brand icon disc, title and description, a
 * summary of the draft, then "save and exit" (primary), "exit without saving" (destructive
 * text) and "keep editing" (text). Presented in a transparent modal over a dark scrim.
 * Differs from `Dialog` (status icon, side-by-side actions), so it is a separate component.
 */
export function SaveDraftDialog({
  visible,
  title,
  description,
  summary,
  saveLabel,
  discardLabel,
  keepEditingLabel,
  onSave,
  onDiscard,
  onKeepEditing,
  onDismiss,
}: SaveDraftDialogProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(MAX_CARD_WIDTH, width - SCREEN_MARGIN * 2);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onKeepEditing}
      onDismiss={onDismiss}>
      <View style={styles.scrim}>
        <View style={[styles.card, { width: cardWidth }]} accessibilityViewIsModal>
          <View
            style={styles.iconDisc}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <PageEdit width={ICON_SIZE} height={ICON_SIZE} color={colors.brand} strokeWidth={1.5} />
          </View>

          <View style={styles.text}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.summary} accessible accessibilityLabel={`${summary.title}, ${summary.meta}`}>
            {summary.imageUri ? (
              <Image
                source={{ uri: summary.imageUri }}
                style={styles.thumb}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <MapIcon
                  width={PLACEHOLDER_ICON_SIZE}
                  height={PLACEHOLDER_ICON_SIZE}
                  color={colors.textTertiary}
                  strokeWidth={1.5}
                />
              </View>
            )}
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {summary.title}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={1}>
                {summary.meta}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button label={saveLabel} onPress={onSave} size="lg" />
            <Button label={discardLabel} onPress={onDiscard} variant="text" destructive />
            <Button label={keepEditingLabel} onPress={onKeepEditing} variant="text" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dialogScrim,
  },
  card: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.dialog,
  },
  iconDisc: {
    width: ICON_DISC_SIZE,
    height: ICON_DISC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ICON_DISC_SIZE / 2,
    backgroundColor: colors.brandSubtle,
  },
  text: {
    alignSelf: 'stretch',
    gap: TEXT_GAP,
  },
  // Same title style as `Dialog` (CLAUDE.md decision: 16 semibold; the frame draws 18).
  title: {
    ...typography.bodyLargeSemibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUMMARY_INSET,
    padding: SUMMARY_INSET,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  summaryText: {
    flex: 1,
    gap: spacing.xxs,
  },
  summaryTitle: {
    ...typography.calloutSemibold,
    color: colors.textPrimary,
  },
  // Design draws 11 pt; 12 keeps it on the type scale.
  summaryMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});
