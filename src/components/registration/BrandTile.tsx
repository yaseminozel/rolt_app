import { Check, Plus } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

import { BrandAvatar } from './BrandAvatar';

const TILE_HEIGHT = 88;
const LOGO_WELL_SIZE = 44;
const CHECK_BADGE_SIZE = 20;
/** Horizontal inset of the manual-entry tile (QKDo5 `K4Dys`). */
const MANUAL_TILE_INSET = 14;
const MANUAL_TILE_GAP = 10;

type SelectableTileProps = {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** Resting outline; the selected outline is always the 2 pt brand stroke. */
  restingBorderColor: string;
  contentStyle: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Tile shell shared by brand tiles and the "Listede yok mu?" tile: resting vs brand-selected chrome. */
function SelectableTile({
  selected,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  restingBorderColor,
  contentStyle,
  children,
}: SelectableTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => [
        styles.tile,
        contentStyle,
        selected
          ? styles.tileSelected
          : { borderColor: restingBorderColor, backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
        style,
      ]}>
      {children}
      {selected ? (
        <View style={styles.checkBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Check width={12} height={12} color={colors.textInverse} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
  );
}

type BrandTileProps = {
  brand: MotorcycleBrand;
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Brand grid tile on 00.9 (QKDo5 "Marka / …"): logo well, name, brand outline + check when selected. */
export function BrandTile({ brand, label, selected, onPress, style }: BrandTileProps) {
  return (
    <SelectableTile
      selected={selected}
      onPress={onPress}
      accessibilityLabel={label}
      restingBorderColor={colors.border}
      contentStyle={styles.brandContent}
      style={style}>
      <BrandAvatar
        brand={brand}
        size={LOGO_WELL_SIZE}
        backgroundColor={selected ? colors.surface : colors.surfaceMuted}
      />
      <Text
        style={[styles.brandLabel, selected && styles.brandLabelSelected]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}>
        {label}
      </Text>
    </SelectableTile>
  );
}

type ManualBrandTileProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** "Listede yok mu? / Markanı elle ekle" tile (QKDo5 `K4Dys`); selected while manual entry is active. */
export function ManualBrandTile({ title, subtitle, selected, onPress, style }: ManualBrandTileProps) {
  return (
    <SelectableTile
      selected={selected}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      restingBorderColor={colors.borderStrong}
      contentStyle={styles.manualContent}
      style={style}>
      <View
        style={[styles.plusWell, selected && styles.plusWellSelected]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Plus width={20} height={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.manualText}>
        <Text style={styles.manualTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.manualSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </SelectableTile>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: TILE_HEIGHT,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.brandSubtle,
  },
  brandContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  brandLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  brandLabelSelected: {
    fontFamily: fontFamily.semibold,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: CHECK_BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  manualContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MANUAL_TILE_GAP,
    paddingHorizontal: MANUAL_TILE_INSET,
  },
  plusWell: {
    width: LOGO_WELL_SIZE,
    height: LOGO_WELL_SIZE,
    borderRadius: LOGO_WELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  plusWellSelected: {
    backgroundColor: colors.surface,
  },
  manualText: {
    flex: 1,
    gap: spacing.xxs,
  },
  manualTitle: {
    ...typography.calloutSemibold,
    color: colors.textPrimary,
  },
  manualSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
