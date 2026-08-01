import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import type { StatCell } from '../utils/cardDisplay';

interface CardStatsGridProps {
  cells: StatCell[];
  variant?: 'dark' | 'light';
}

export function CardStatsGrid({ cells, variant = 'dark' }: CardStatsGridProps) {
  if (!cells.length) return null;
  const light = variant === 'light';

  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View
          key={cell.label}
          style={[styles.box, light ? styles.boxLight : styles.boxDark]}
        >
          <Text style={[styles.label, light && styles.labelLight]}>{cell.label}</Text>
          <Text
            style={[styles.value, light && styles.valueLight]}
            numberOfLines={2}
          >
            {cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  box: {
    flexGrow: 1,
    flexBasis: '48%',
    maxWidth: '100%',
    minWidth: 100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  boxDark: {
    backgroundColor: 'rgba(12, 31, 61, 0.85)',
    borderColor: 'rgba(232, 185, 35, 0.22)',
  },
  boxLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.goldInk,
    marginBottom: 4,
  },
  labelLight: {
    color: '#64748b',
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  valueLight: {
    color: '#0f172a',
  },
});
