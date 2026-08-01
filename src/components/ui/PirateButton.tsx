import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, elevation, radii, spacing, typography } from '../../constants/theme';

type Variant = 'primary' | 'gold' | 'ghost';
type Size = 'md' | 'lg';

interface PirateButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Botón de acción. `primary` en rojo bandera, `gold` para lo más destacado
 * (abrir un sobre), `ghost` para acciones secundarias.
 */
export function PirateButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  accessibilityLabel,
}: PirateButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        VARIANTS[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, LABELS[variant], size === 'lg' && styles.labelLg]}>
        {label}
      </Text>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
    ...elevation.low,
  },
  gold: {
    backgroundColor: colors.gold,
    borderColor: colors.goldBright,
    ...elevation.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.borderStrong,
  },
};

const LABELS: Record<Variant, { color: string }> = {
  primary: { color: colors.textOnPrimary },
  gold: { color: colors.textOnGold },
  ghost: { color: colors.textMuted },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.38 },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  labelLg: {
    fontSize: 15,
  },
});
