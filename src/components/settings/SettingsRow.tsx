import { Check, NavArrowRight } from 'iconoir-react-native';
import type { ComponentType, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { RadioButton } from '@/components/ui/RadioButton';
import { Switch } from '@/components/ui/Switch';
import { colors, fontFamily, spacing } from '@/theme';

const ICON_SIZE = 20;
const ROW_MIN_HEIGHT = 52;
/** Stroke of the "Onay" check glyph: 1.8 pt at 20 pt, expressed in the 24-unit viewBox. */
const CHECK_STROKE = (1.8 * 24) / ICON_SIZE;

/** Trailing element of the row ("Son" property in the design). */
export type SettingsRowTrailing =
  'chevron' | 'valueChevron' | 'value' | 'switch' | 'check' | 'none' | 'radio';

type SettingsRowBaseProps = {
  /** Leading 20 pt Iconoir glyph, e.g. `User`; omitted on text-only rows (10.01 "Topluluk"). */
  icon?: ComponentType<SvgProps>;
  label: string;
  /** Secondary line under the label; hidden in every design instance, so optional. */
  description?: string;
  /** Red, medium-weight label as used by "Çıkış yap" on `03.1 Profil / Ayarlar`. */
  destructive?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

type ChevronRowProps = { trailing: 'chevron'; onPress: () => void };
type ValueChevronRowProps = {
  trailing: 'valueChevron';
  value: string;
  /** Draws a chosen value in the primary colour instead of the muted one (04.03 `FuSKr`). */
  valueEmphasis?: boolean;
  onPress: () => void;
};
type ValueRowProps = { trailing: 'value'; value: string; onPress?: () => void };
type SwitchRowProps = {
  trailing: 'switch';
  switchValue: boolean;
  onSwitchValueChange: (value: boolean) => void;
};
/** The check mark is drawn only while `selected` is true. */
type CheckRowProps = { trailing: 'check'; selected: boolean; onPress: () => void };
type NoneRowProps = { trailing: 'none'; onPress?: () => void };
type RadioRowProps = { trailing: 'radio'; selected: boolean; onPress: () => void };

export type SettingsRowProps = SettingsRowBaseProps &
  (
    | ChevronRowProps
    | ValueChevronRowProps
    | ValueRowProps
    | SwitchRowProps
    | CheckRowProps
    | NoneRowProps
    | RadioRowProps
  );

/**
 * Settings list row: icon, label and one trailing element.
 * Pencil node `MAiVR` ("Satır / Ayar", Son = Chevron, Değer+Chevron, Değer, Anahtar,
 * Onay, Yok, Radyo). Grouping cards and dividers belong to the screen.
 */
export function SettingsRow(props: SettingsRowProps) {
  const { icon: Icon, label, description, destructive, disabled, style } = props;

  let trailing: ReactNode = null;
  let onPress: (() => void) | undefined;
  let role: AccessibilityRole = 'button';
  let state: AccessibilityState = { disabled };

  switch (props.trailing) {
    case 'chevron':
      trailing = <Chevron />;
      onPress = props.onPress;
      break;
    case 'valueChevron':
      trailing = (
        <>
          <Value text={props.value} emphasis={props.valueEmphasis} />
          <Chevron />
        </>
      );
      onPress = props.onPress;
      break;
    case 'value':
      trailing = <Value text={props.value} />;
      onPress = props.onPress;
      break;
    case 'switch': {
      const { switchValue, onSwitchValueChange } = props;
      // The whole row toggles; the switch itself is presentational here.
      trailing = (
        <Decorative>
          <Switch
            tone="accent"
            value={switchValue}
            onValueChange={onSwitchValueChange}
            disabled={disabled}
            style={styles.switch}
          />
        </Decorative>
      );
      onPress = () => onSwitchValueChange(!switchValue);
      role = 'switch';
      state = { checked: switchValue, disabled };
      break;
    }
    case 'check':
      trailing = props.selected ? (
        <Check
          width={ICON_SIZE}
          height={ICON_SIZE}
          color={colors.textPrimary}
          strokeWidth={CHECK_STROKE}
        />
      ) : (
        <View style={styles.trailingPlaceholder} />
      );
      onPress = props.onPress;
      role = 'radio';
      state = { selected: props.selected, disabled };
      break;
    case 'radio':
      trailing = (
        <Decorative>
          <RadioButton variant="outlined" selected={props.selected} disabled={disabled} />
        </Decorative>
      );
      onPress = props.onPress;
      role = 'radio';
      state = { checked: props.selected, disabled };
      break;
    case 'none':
      onPress = props.onPress;
      break;
  }

  const content = (
    <>
      {Icon ? (
        <Icon
          width={ICON_SIZE}
          height={ICON_SIZE}
          color={destructive ? colors.dangerText : colors.textPrimary}
        />
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing}
    </>
  );

  const rowStyle = [styles.container, props.trailing === 'switch' && styles.switchRow, style];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={state}
      style={rowStyle}>
      {content}
    </Pressable>
  );
}

function Chevron() {
  return <NavArrowRight width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} />;
}

function Value({ text, emphasis = false }: { text: string; emphasis?: boolean }) {
  return (
    <Text style={[styles.value, emphasis && styles.valueEmphasis]} numberOfLines={1}>
      {text}
    </Text>
  );
}

/** Hides a nested control from touch and accessibility so the row owns the interaction. */
function Decorative({ children }: { children: ReactNode }) {
  return (
    <View
      style={styles.decorative}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  switchRow: {
    // The switch brings its own vertical padding; the row keeps its 52 pt height.
    paddingVertical: 0,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  labelDestructive: {
    fontFamily: fontFamily.medium,
    color: colors.dangerText,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  value: {
    flexShrink: 1,
    maxWidth: '50%',
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  valueEmphasis: {
    color: colors.textPrimary,
  },
  switch: {
    alignSelf: 'center',
  },
  trailingPlaceholder: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  decorative: {
    pointerEvents: 'none',
  },
});
