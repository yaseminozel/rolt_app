import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Globe, Group, MediaImage, Motorcycle, NavArrowDown, Xmark } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/feedback/ToastProvider';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import { useCreatePost } from '@/features/community/queries';
import type { PostAudience, PostRide } from '@/features/community/types';
import { useOwnProfile } from '@/features/profile/queries';
import { useSavedRides } from '@/features/rides/queries';
import { rideTitle } from '@/features/rides/rideTitle';
import { initialsOf } from '@/lib/initials';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, radius, spacing, typography } from '@/theme';

const MAX_PHOTOS = 4;
const TEXT_MAX = 500;
const AVATAR_SIZE = 32;
const THUMB_SIZE = 56;
const AUDIENCE_ICONS = { public: Globe, followers: Group } as const;

/**
 * "Paylaşım alanı / Topluluk" (13.01 `1005:39840`, typing `1114:22352`): write a post, attach
 * photos or one of your saved rides, choose who sees it ("Herkese açık" / followers) and
 * "Paylaş". Covers the four sharing scenarios of note `1102:18298`.
 */
export function PostComposer({ onFocus }: { onFocus?: () => void }) {
  const { t } = useTranslation('community');
  const { showToast } = useToast();
  const { data: profile } = useOwnProfile();
  const { data: savedRides = [] } = useSavedRides();
  const createPost = useCreatePost();
  const [text, setText] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [ride, setRide] = useState<PostRide | null>(null);
  const [audience, setAudience] = useState<PostAudience>('public');

  const canPost = Boolean(text.trim() || photoUris.length > 0 || ride) && !createPost.isPending;
  const AudienceIcon = AUDIENCE_ICONS[audience];

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

  const chooseRide = () =>
    showActionSheet({
      title: t('composer.rideTitle'),
      options: savedRides.slice(0, 6).map((item) => ({
        label: rideTitle(item),
        onPress: () =>
          setRide({
            title: rideTitle(item),
            description: item.notes.trim() || undefined,
            rideType: item.rideType,
            distanceKm: item.stats.distanceM / 1000,
            durationMinutes: item.stats.durationS / 60,
            averageSpeedKmh:
              item.stats.durationS > item.stats.breakS
                ? item.stats.distanceM / 1000 / ((item.stats.durationS - item.stats.breakS) / 3600)
                : undefined,
          }),
      })),
      cancelLabel: t('composer.cancel'),
    });

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
      await createPost.mutateAsync({
        text: text.trim() || undefined,
        photoUris,
        ride: ride ?? undefined,
        audience,
      });
      setText('');
      setPhotoUris([]);
      setRide(null);
      showToast({ variant: 'success', message: t('composer.posted') });
    } catch {
      showToast({ variant: 'failure', message: t('composer.failed') });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.inputRow}>
        <ProfileAvatar
          source={profile?.photoUri ? { uri: profile.photoUri } : profile?.sampleAvatar}
          initials={profile ? initialsOf(profile.name) : undefined}
          size={AVATAR_SIZE}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={onFocus}
          placeholder={t('composer.placeholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={TEXT_MAX}
          style={styles.input}
          accessibilityLabel={t('composer.placeholder')}
        />
      </View>

      {photoUris.length > 0 || ride ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachments}>
          {ride ? (
            <View style={styles.rideChip}>
              <Motorcycle width={16} height={16} color={colors.textPrimary} strokeWidth={1.5} />
              <Text style={styles.rideChipLabel} numberOfLines={1}>
                {ride.title}
              </Text>
              <Pressable
                onPress={() => setRide(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('composer.removeRide')}>
                <Xmark width={14} height={14} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}
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

      <View style={styles.footer}>
        <Pressable
          onPress={chooseAudience}
          accessibilityRole="button"
          accessibilityLabel={t('composer.audienceTitle')}
          accessibilityValue={{ text: t(`composer.audience.${audience}`) }}
          style={({ pressed }) => [styles.audience, pressed && styles.pressed]}>
          <AudienceIcon width={16} height={16} color={colors.textPrimary} strokeWidth={1.5} />
          <Text style={styles.audienceLabel}>{t(`composer.audience.${audience}`)}</Text>
          <NavArrowDown width={14} height={14} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.tools}>
          <Pressable
            onPress={addPhotos}
            disabled={photoUris.length >= MAX_PHOTOS}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('composer.addPhoto')}
            style={styles.tool}>
            <MediaImage width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
          </Pressable>
          {savedRides.length > 0 ? (
            <Pressable
              onPress={chooseRide}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('composer.addRide')}
              style={styles.tool}>
              <Motorcycle width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          ) : null}
          <Button
            label={t('composer.share')}
            disabled={!canPost}
            loading={createPost.isPending}
            onPress={share}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: AVATAR_SIZE,
    maxHeight: 120,
    paddingTop: 6,
    paddingBottom: 0,
    color: colors.textPrimary,
  },
  attachments: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  rideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 220,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  rideChipLabel: {
    ...typography.caption,
    flexShrink: 1,
    color: colors.textPrimary,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audience: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  audienceLabel: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tool: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
