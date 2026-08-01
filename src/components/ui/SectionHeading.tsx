import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface SectionHeadingProps {
  title: string;
  /** Texto pequeño a la derecha: contadores, estado. */
  meta?: string;
  style?: StyleProp<ViewStyle>;
}

/** Título de sección con la marca ☠ y un filete que ocupa el resto del ancho. */
export function SectionHeading({ title, meta, style }: SectionHeadingProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.mark}>☠</Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rule} />
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mark: {
    color: colors.goldInk,
    fontSize: 13,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    textTransform: 'uppercase',
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderGold,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
