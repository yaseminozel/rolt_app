import { User } from 'iconoir-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import { Badge } from '@/components/ui/Badge';
import { colors, radius, spacing, typography } from '@/theme';

import { BrandAvatar } from './BrandAvatar';

const BIKE_LOGO_WELL_SIZE = 56;
const USER_AVATAR_SIZE = 40;
/** Card section insets from LreVd (`iQcBK` padding 18, `Z70aD` [14, 18], `etJbp` [14, 18, 16, 18]). */
const SECTION_INSET = 18;
const SECTION_VERTICAL_INSET = 14;

export type GarageSummaryBike = {
  brand?: MotorcycleBrand;
  brandName: string;
  /** e.g. "Yamaha MT-07". */
  title: string;
  /** e.g. "2022 · 689 cc · Naked"; hidden when empty. */
  detail?: string;
};

type GarageSummaryCardProps = {
  /** Omitted when the bike steps were skipped: the bike band is hidden. */
  bike?: GarageSummaryBike;
  mainBikeLabel: string;
  name: string;
  /** e.g. "@yaseminrides · İstanbul". */
  handleLine: string;
  photoUri?: string;
  ridingStyleLabel: string;
  /** Short preference tags; the section is hidden when empty. */
  tags: string[];
};

/**
 * Registration summary card on 00.12 (LreVd "Garaj kartı"): main bike band, user row and
 * riding style tags. Tags use the neutral small `Badge` rather than the frame's one-off pills.
 */
export function GarageSummaryCard({
  bike,
  mainBikeLabel,
  name,
  handleLine,
  photoUri,
  ridingStyleLabel,
  tags,
}: GarageSummaryCardProps) {
  const hasTags = tags.length > 0;

  return (
    <View style={styles.card}>
      {bike ? (
        <View style={styles.bike} accessible accessibilityLabel={[mainBikeLabel, bike.title, bike.detail].filter(Boolean).join(', ')}>
          <BrandAvatar
            brand={bike.brand}
            customName={bike.brandName}
            size={BIKE_LOGO_WELL_SIZE}
            backgroundColor={colors.surface}
          />
          <View style={styles.bikeText}>
            <Text style={styles.eyebrow}>{mainBikeLabel}</Text>
            <Text style={styles.bikeTitle} numberOfLines={2}>
              {bike.title}
            </Text>
            {bike.detail ? <Text style={styles.bikeDetail}>{bike.detail}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.user, hasTags && styles.divider]} accessible accessibilityLabel={`${name}, ${handleLine}`}>
        <View style={styles.userAvatar}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.userPhoto} accessibilityIgnoresInvertColors />
          ) : (
            <User width={20} height={20} color={colors.textSecondary} strokeWidth={1.5} />
          )}
        </View>
        <View style={styles.userText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            {handleLine}
          </Text>
        </View>
      </View>

      {hasTags ? (
        <View style={styles.preferences}>
          <Text style={styles.preferencesLabel}>{ridingStyleLabel}</Text>
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Badge key={tag} label={tag} showIcon={false} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  bike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: SECTION_INSET,
    backgroundColor: colors.brandSubtle,
  },
  bikeText: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.brand,
  },
  bikeTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  bikeDetail: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: SECTION_VERTICAL_INSET,
    paddingHorizontal: SECTION_INSET,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: USER_AVATAR_SIZE,
    height: USER_AVATAR_SIZE,
    borderRadius: USER_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  userPhoto: {
    width: USER_AVATAR_SIZE,
    height: USER_AVATAR_SIZE,
  },
  userText: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  handle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  preferences: {
    gap: 10,
    paddingTop: SECTION_VERTICAL_INSET,
    paddingBottom: spacing.lg,
    paddingHorizontal: SECTION_INSET,
  },
  preferencesLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
