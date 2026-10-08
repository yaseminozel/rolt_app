import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { MediaImagePlus, Xmark } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useToast } from '@/components/feedback/ToastProvider';
import { useCreatePost } from '@/features/community/queries';
import type { PostAudience } from '@/features/community/types';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, fontFamily, radius, spacing } from '@/theme';

const MAX_PHOTOS = 4;
const TEXT_MAX = 500;
const TOOL_SIZE = 36;
const THUMB_SIZE = 56;

/**
 * "Paylaşım alanı / Topluluk" (13.01 Pencil `uV7oN`, typing `T0ZMr`): a bordered field (dark
 * border while typing), a photo button, the audience and a pill "Paylaş" that turns dark once
 * there is something to share. Ride posts are shared from the ride itself.
 */
export function PostComposer() {
  const { t } = useTranslation('community');
  const { showToast } = useToast();
  const createPost = useCreatePost();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [audience, setAudience] = useState<PostAudience>('public');

  const canPost = Boolean(text.trim() || photoUris.length > 0) && !createPost.isPending;

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photoUris.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      setPhotoUris((current) =>
        [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_PHOTOS),
      );
    }
  };

  const chooseAudience = () =>
    showActionSheet({
      title: t('composer.audienceTitle'),
      options: (['public', 'followers'] as const).map((item) => ({
        label: t(`composer.audience.${item}`),
        onPress: () => setAudience(item),
      })),
      cancelLabel: t('composer.cancel'),
    });

  const share = async () => {
    try {
      await createPost.mutateAsync({ text: text.trim() || undefined, photoUris, audience });
      setText('');
      setPhotoUris([]);
      showToast({ variant: 'success', message: t('composer.posted') });
    } catch {
      showToast({ variant: 'failure', message: t('composer.failed') });
    }
  };

  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('composer.placeholder')}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.textPrimary}
        multiline
        maxLength={TEXT_MAX}
        style={styles.input}
        accessibilityLabel={t('composer.placeholder')}
      />

      {photoUris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photoUris.map((uri) => (
            <View key={uri} style={styles.thumb}>
              <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
              <Pressable
                onPress={() => setPhotoUris((current) => current.filter((item) => item !== uri))}
                accessibilityRole="button"
                accessibilityLabel={t('composer.removePhoto')}
                style={styles.thumbRemove}>
                <Xmark width={12} height={12} color={colors.textInverse} strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.toolbar}>
        <Pressable
          onPress={addPhotos}
          disabled={photoUris.length >= MAX_PHOTOS}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t('composer.addPhoto')}
          style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]}>
          <MediaImagePlus width={16} height={16} color={colors.emptyStateGlyph} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.right}>
          <Pressable
            onPress={chooseAudience}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('composer.audienceTitle')}
            accessibilityValue={{ text: t(`composer.audience.${audience}`) }}>
            <Text style={styles.audience}>{t(`composer.audience.${audience}`)}</Text>
          </Pressable>
          <Pressable
            onPress={share}
            disabled={!canPost}
            accessibilityRole="button"
            accessibilityLabel={t('composer.share')}
            accessibilityState={{ disabled: !canPost, busy: createPost.isPending }}
            style={({ pressed }) => [
              styles.shareButton,
              canPost && styles.shareButtonActive,
              pressed && canPost && styles.shareButtonPressed,
            ]}>
            {createPost.isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.shareLabel, canPost && styles.shareLabelActive]}>
                {t('composer.share')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardFocused: {
    borderColor: colors.textPrimary,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 17,
    maxHeight: 140,
    padding: 0,
    color: colors.textPrimary,
  },
  thumbs: {
    gap: spacing.sm,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.mapScrim,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tool: {
    width: TOOL_SIZE,
    height: TOOL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOOL_SIZE / 2,
    backgroundColor: colors.tile,
  },
  toolPressed: {
    backgroundColor: colors.surfacePressed,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  audience: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  shareButton: {
    height: 34,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  shareButtonActive: {
    backgroundColor: colors.textPrimary,
  },
  shareButtonPressed: {
    opacity: 0.85,
  },
  shareLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.borderStrong,
  },
  shareLabelActive: {
    color: colors.textInverse,
  },
});
