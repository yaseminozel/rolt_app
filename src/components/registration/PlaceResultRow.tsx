import { MapPin, MapsArrow } from 'iconoir-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

const ICON_DISC = 32;
const PIN_SIZE = 14;
const ARROW_SIZE = 18;
const ROW_HEIGHT = 62;

type PlaceResultRowProps = {
  name: string;
  subtitle?: string;
  /** "Mevcut konumu kullan": brand label, navigation arrow and a dark subtitle. */
  currentLocation?: boolean;
  /** Shows a spinner in the icon disc (e.g. while the current position is resolved). */
  busy?: boolean;
  onPress: () => void;
};

/**
 * Result row of the 04.02 "Konumun" search (Pencil `R90P27`): 32 pt muted disc with a pin,
 * place name and its region; the first row uses the device location instead.
 */
export function PlaceResultRow({ name, subtitle, currentLocation = false, busy, onPress }: PlaceResultRowProps) {
  const Icon = currentLocation ? MapsArrow : MapPin;
  const iconSize = currentLocation ? ARROW_SIZE : PIN_SIZE;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${name}, ${subtitle}` : name}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.disc}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Icon
            width={iconSize}
            height={iconSize}
            color={currentLocation ? colors.brand : colors.textPrimary}
            strokeWidth={1.5}
          />
        )}
      </View>
      <View style={styles.text}>
        <Text style={currentLocation ? styles.currentName : styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, currentLocation && styles.currentSubtitle]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  disc: {
    width: ICON_DISC,
    height: ICON_DISC,
    borderRadius: ICON_DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    ...typography.bodyLargeMedium,
    color: colors.textPrimary,
  },
  currentName: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 17,
    color: colors.brand,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  currentSubtitle: {
    color: colors.textPrimary,
  },
});
