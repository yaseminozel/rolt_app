import { BlurView } from 'expo-blur';
import { MediaImage, Page, Xmark } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

/** Same as `ProfileTopBar`: 6 pt under the status bar, 44 pt targets around 40 pt frames. */
const BAR_TOP_OFFSET = 6;
const BUTTON = 40;
/** The menu card starts 48 pt under the top of the "+" (y 57 → 105). */
const MENU_GAP = 8;

type AddMenuItem = { key: string; icon: ComponentType<SvgProps>; label: string; onPress: () => void };

type AddMenuProps = {
  visible: boolean;
  onClose: () => void;
  onPost: () => void;
  onPhotos: () => void;
};

/**
 * "Menu / Ekle" (09.01 Pencil `niGQX`): the "+" turns into a dark ×, the profile blurs behind a
 * white veil and a card offers "Gönderi yayınla" and "Fotoğraf ekle". ("Manuel sürüş ekle" is
 * left out until its form is designed — user decision 2026-10-09.)
 */
export function AddMenu({ visible, onClose, onPost, onPhotos }: AddMenuProps) {
  const { t } = useTranslation('profile');
  const insets = useSafeAreaInsets();
  const buttonTop = insets.top + BAR_TOP_OFFSET + (layout.minTouchTarget - BUTTON) / 2;

  const items: AddMenuItem[] = [
    { key: 'post', icon: Page, label: t('addMenu.post'), onPress: onPost },
    { key: 'photos', icon: MediaImage, label: t('addMenu.photos'), onPress: onPhotos },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('addMenu.close')}>
        <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.veil]} />
      </Pressable>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('addMenu.close')}
        style={[styles.close, { top: buttonTop }]}>
        <Xmark width={20} height={20} color={colors.textInverse} strokeWidth={1.8} />
      </Pressable>
      <View style={[styles.menu, { top: buttonTop + BUTTON + MENU_GAP }]} accessibilityRole="menu">
        {items.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
              <item.icon width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
              <Text style={styles.label}>{item.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    backgroundColor: colors.menuVeil,
  },
  close: {
    position: 'absolute',
    left: layout.screenGutter,
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  menu: {
    position: 'absolute',
    left: layout.screenGutter,
    width: 240,
    paddingVertical: spacing.sm,
    borderRadius: radius.media,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: shadows.menu,
  },
  item: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  itemPressed: {
    backgroundColor: colors.surfacePressed,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.menuDivider,
  },
});
