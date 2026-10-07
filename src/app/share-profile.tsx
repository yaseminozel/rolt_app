import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  ChatBubble,
  Download,
  Instagram,
  Link,
  MoreHoriz,
  Whatsapp,
  Xmark,
} from 'iconoir-react-native';
import { useRef, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { useToast } from '@/components/feedback/ToastProvider';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { QrCode } from '@/components/profile/QrCode';
import { useOwnProfile } from '@/features/profile/queries';
import { profileLink, profileLinkLabel } from '@/features/profile/profileLink';
import { initialsOf } from '@/lib/initials';
import { colors, fontFamily, layout, radius, shadows, spacing, typography } from '@/theme';

const QR_SIZE = 200;
const TILE = 52;
const airdropIcon = require('../../assets/images/share/airdrop.png');

type Target = 'airdrop' | 'messages' | 'whatsapp' | 'instagram' | 'more';
const ICONS: Record<Exclude<Target, 'airdrop'>, ComponentType<SvgProps>> = {
  messages: ChatBubble,
  whatsapp: Whatsapp,
  instagram: Instagram,
  more: MoreHoriz,
};
// AirDrop is iOS only; elsewhere the system share sheet ("Daha fazla") covers nearby sharing.
const TARGETS: readonly Target[] =
  Platform.OS === 'ios'
    ? ['airdrop', 'messages', 'whatsapp', 'instagram', 'more']
    : ['messages', 'whatsapp', 'instagram', 'more'];

/**
 * 09.02 Profil / Profili paylaş (Pencil `cSDrw`): the profile's QR card over the dimmed profile
 * and a share panel. Messages and WhatsApp open with the link; AirDrop, Instagram and "Daha
 * fazla" use the system share sheet. The design's recent-contacts row is the iOS share sheet's
 * own and isn't drawn here. "Görseli kaydet" saves the QR card to Photos.
 */
export default function ShareProfileScreen() {
  const { t } = useTranslation('profile');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data: profile } = useOwnProfile();
  const cardRef = useRef<View>(null);

  if (!profile) {
    return null;
  }

  const link = profileLink(profile.handle);
  const message = t('shareSheet.message', { link });
  const avatar = profile.photoUri ? { uri: profile.photoUri } : profile.sampleAvatar;
  const close = () => router.back();

  const share = async (target: Target) => {
    try {
      if (target === 'messages') {
        await Linking.openURL(
          `sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`,
        );
        return;
      }
      if (target === 'whatsapp') {
        await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
        return;
      }
    } catch {
      // The app isn't there: fall through to the share sheet.
    }
    await Share.share({ message, url: Platform.OS === 'ios' ? link : undefined }).catch(
      () => undefined,
    );
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    showToast({ variant: 'success', message: t('shareSheet.linkCopied') });
  };

  const saveImage = async () => {
    try {
      if (Platform.OS === 'web') {
        throw new Error('Saving images needs the native photo library');
      }
      // Loaded on demand: the photo library module doesn't exist in the web preview.
      /* eslint-disable @typescript-eslint/no-require-imports */
      const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
      const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      /* eslint-enable @typescript-eslint/no-require-imports */
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(
          t('shareSheet.photosPermission.title'),
          t('shareSheet.photosPermission.message'),
          [
            { text: t('menu.cancel'), style: 'cancel' },
            { text: t('photo.openSettings'), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast({ variant: 'success', message: t('shareSheet.imageSaved') });
    } catch {
      showToast({ variant: 'failure', message: t('shareSheet.imageFailed') });
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityLabel={t('shareSheet.close')}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.veil]} />
      </Pressable>

      <View style={styles.cardSlot} pointerEvents="box-none">
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <View style={styles.cardIdentity}>
            <View style={styles.cardText}>
              <Text style={styles.cardHandle} numberOfLines={1}>
                {t('handle', { handle: profile.handle })}
              </Text>
              <Text style={styles.cardLabel}>{t('shareSheet.cardLabel')}</Text>
            </View>
            <ProfileAvatar source={avatar} size={40} initials={initialsOf(profile.name)} />
          </View>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('shareSheet.qrA11y', { handle: profile.handle })}>
            <QrCode value={link} size={QR_SIZE} />
          </View>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.handle} />
        <View style={styles.panelHeader}>
          <View style={styles.preview}>
            <QrCode value={link} size={32} />
          </View>
          <View style={styles.panelTitle}>
            <Text style={styles.title} accessibilityRole="header">
              {t('shareSheet.title')}
            </Text>
            <Text style={styles.link} numberOfLines={1}>
              {profileLinkLabel(profile.handle)}
            </Text>
          </View>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('shareSheet.close')}
            hitSlop={8}
            style={styles.close}>
            <Xmark width={14} height={14} color={colors.textPrimary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.targets}>
          {TARGETS.map((target) => {
            const Icon = target === 'airdrop' ? null : ICONS[target];
            return (
              <Pressable
                key={target}
                onPress={() => share(target)}
                accessibilityRole="button"
                accessibilityLabel={t(`shareSheet.targets.${target}`)}
                style={({ pressed }) => [styles.target, pressed && styles.pressed]}>
                <View style={styles.tile}>
                  {Icon ? (
                    <Icon width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
                  ) : (
                    <Image source={airdropIcon} style={styles.airdrop} />
                  )}
                </View>
                <Text style={styles.targetLabel} numberOfLines={1}>
                  {t(`shareSheet.targets.${target}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />
        <ActionRow label={t('shareSheet.copyLink')} icon={Link} onPress={copyLink} />
        <View style={styles.divider} />
        <ActionRow label={t('shareSheet.saveImage')} icon={Download} onPress={saveImage} />
      </View>
    </View>
  );
}

function ActionRow({
  label,
  icon: Icon,
  onPress,
}: {
  label: string;
  icon: ComponentType<SvgProps>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Icon width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  veil: {
    backgroundColor: colors.shareVeil,
  },
  cardSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: 14,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.qrCard,
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardHandle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  cardLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: 14,
  },
  preview: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  panelTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyLargeSemibold,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  link: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  targets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing.lg,
  },
  target: {
    width: 64,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  tile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  airdrop: {
    width: 24,
    height: 24,
  },
  targetLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    marginHorizontal: layout.screenGutter,
    backgroundColor: colors.border,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.screenGutter,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  rowLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
