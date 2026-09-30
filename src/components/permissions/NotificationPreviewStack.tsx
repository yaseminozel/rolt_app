import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';

const PANEL_HEIGHT = 220;
/** Panel padding [28, 18] and card gap 10 ("Görsel"). */
const PANEL_PADDING_VERTICAL = 28;
const PANEL_PADDING_HORIZONTAL = 18;
const CARD_GAP = 10;
const APP_ICON_SIZE = 34;
const APP_ICON_GLYPH = 18;
/** Body copy 12 pt at 1.35. */
const BODY_LINE_HEIGHT = 16;

const panelGradient = `linear-gradient(to bottom, ${colors.notificationPanelTop} 0%, ${colors.notificationPanelBottom} 100%)`;

export type NotificationPreview = {
  key: string;
  icon: ComponentType<SvgProps>;
  /** App icon tile color. */
  iconBackground: string;
  title: string;
  time: string;
  text: string;
  /** Older notifications fade out (1 → 0.75 → 0.45 in the design). */
  opacity: number;
};

type NotificationPreviewStackProps = {
  notifications: readonly NotificationPreview[];
};

/**
 * Illustration of 00.14 İzin / Bildirimler (RzQd4 "Görsel"): a soft indigo gradient panel
 * with stacked, fading lock-screen style notification cards. Static and decorative.
 */
export function NotificationPreviewStack({ notifications }: NotificationPreviewStackProps) {
  return (
    <View style={styles.panel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {notifications.map(({ key, icon: Icon, iconBackground, title, time, text, opacity }) => (
        <View key={key} style={[styles.card, { opacity }]}>
          <View style={[styles.appIcon, { backgroundColor: iconBackground }]}>
            <Icon width={APP_ICON_GLYPH} height={APP_ICON_GLYPH} color={colors.textInverse} strokeWidth={1.5} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.time}>{time}</Text>
            </View>
            <Text style={styles.text} numberOfLines={1}>
              {text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Content is centred and may overflow the padding like the design (clip: true).
  panel: {
    height: PANEL_HEIGHT,
    justifyContent: 'center',
    gap: CARD_GAP,
    paddingVertical: PANEL_PADDING_VERTICAL,
    paddingHorizontal: PANEL_PADDING_HORIZONTAL,
    borderRadius: radius.media,
    overflow: 'hidden',
    backgroundImage: panelGradient,
  },
  card: {
    flexDirection: 'row',
    gap: CARD_GAP,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.notificationCardSurface,
    boxShadow: shadows.notification,
  },
  appIcon: {
    width: APP_ICON_SIZE,
    height: APP_ICON_SIZE,
    borderRadius: radius.appIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.calloutSemibold,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textTertiary,
  },
  text: {
    ...typography.caption,
    lineHeight: BODY_LINE_HEIGHT,
    color: colors.textBody,
  },
});
