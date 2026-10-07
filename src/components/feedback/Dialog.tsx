import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

import { StatusIcon, type StatusIconStatus } from './StatusIcon';

export type DialogProps = {
  /** Status badge above the title; the design shows `error` for confirmations. */
  status: StatusIconStatus;
  title: string;
  description: string;
  /**
   * Action buttons laid out in the "Aksiyonlar" row, each stretched to equal width.
   * The design uses core Buttons: Outlined (cancel) then Contained / Destructive (confirm).
   */
  actions: ReactNode;
  /** `row` (default): side by side; `column`: stacked full width (08.10 "Kaydetmeden çık"). */
  actionsLayout?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
};

/**
 * Presentational dialog card (Pencil `s5345`): status icon, centered title and
 * description, and a row of actions. The scrim and modal presentation belong to the caller.
 */
export function Dialog({ status, title, description, actions, actionsLayout = 'row', style }: DialogProps) {
  return (
    <View style={[styles.card, style]} accessibilityViewIsModal>
      <View style={styles.content}>
        <StatusIcon status={status} />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={[styles.actions, actionsLayout === 'column' && styles.actionsColumn]}>
        {Children.map(actions, (action) =>
          action == null || typeof action === 'boolean' ? null : (
            <View style={actionsLayout === 'row' ? styles.action : null}>{action}</View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 313,
    alignItems: 'center',
    gap: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.overlay,
  },
  content: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    // Design decision: node says 16 medium, the logout screen 17 semibold; 16 semibold keeps
    // the type scale and gives the title clear weight contrast over the 14 pt description.
    ...typography.bodyLargeSemibold,
    alignSelf: 'stretch',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    lineHeight: 20,
    alignSelf: 'stretch',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  action: {
    flex: 1,
  },
});
