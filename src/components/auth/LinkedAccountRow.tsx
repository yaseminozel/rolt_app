import { Link } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { SocialProviderIcon, type SocialProvider } from '@/components/brand';
import { colors, radius, spacing, typography } from '@/theme';

export type LinkedAccountRowProps = {
  provider: SocialProvider;
  email: string;
  /** e.g. "Google ile bağlı". */
  methodLabel: string;
};

const LOGO_WELL_SIZE = 40;
const LOGO_SIZE = 24;
const LINK_ICON_SIZE = 18;
/** Horizontal inset from the design ("Hesap" padding [12, 14]); off the 4 pt scale. */
const ROW_INSET = 14;

/**
 * Account summary on 00.2 "Hesap Google ile bağlı" (Pencil `D6aiV`): provider mark in a
 * muted well, email, sign-in method and a decorative link glyph. Read as one element.
 */
export function LinkedAccountRow({ provider, email, methodLabel }: LinkedAccountRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${email}, ${methodLabel}`}>
      <View style={styles.logoWell}>
        <SocialProviderIcon provider={provider} size={LOGO_SIZE} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
          {email}
        </Text>
        <Text style={styles.method}>{methodLabel}</Text>
      </View>
      <Link
        width={LINK_ICON_SIZE}
        height={LINK_ICON_SIZE}
        color={colors.textTertiary}
        strokeWidth={1.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: ROW_INSET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  logoWell: {
    width: LOGO_WELL_SIZE,
    height: LOGO_WELL_SIZE,
    borderRadius: LOGO_WELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  email: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  method: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
