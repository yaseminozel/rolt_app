import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { routeTagTones } from '@/components/map/routeTagTones';
import type { RouteTag } from '@/features/routes/types';
import { fontFamily, radius, spacing } from '@/theme';

/**
 * Tag pill on the route preview card (01.7 `wo7Us` "Etiket"), tinted like the route's line
 * on the map so card and line read as one route.
 */
export function RouteTagPill({ tag }: { tag: RouteTag }) {
  const { t } = useTranslation('routes');
  const tone = routeTagTones[tag];

  return (
    <View style={[styles.pill, { backgroundColor: tone.surface }]}>
      <Text style={[styles.label, { color: tone.ink }]} numberOfLines={1}>
        {t(`tags.${tag}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
});
