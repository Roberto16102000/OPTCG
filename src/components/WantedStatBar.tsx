import { StyleSheet, Text, View } from 'react-native';
import type { OnePieceCard } from '../types/card';

function stripPrefix(value: string | number | undefined, prefix: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const s = String(value).trim();
  if (s.startsWith(prefix)) return s.slice(prefix.length).trim() || '—';
  return s;
}

function colorDot(color: string): string {
  const c = color.toLowerCase();
  if (c.includes('red')) return '#c41e3a';
  if (c.includes('blue')) return '#2563eb';
  if (c.includes('green')) return '#16a34a';
  if (c.includes('yellow') || c.includes('purple') || c.includes('black')) return '#ca8a04';
  return '#64748b';
}

interface WantedStatBarProps {
  card: OnePieceCard;
}

export function WantedStatBar({ card }: WantedStatBarProps) {
  const isLeader = card.type === 'LEADER';
  const lifeOrCost = isLeader
    ? stripPrefix(card.cost, 'Life')
    : stripPrefix(card.cost, 'Cost');
  const power = stripPrefix(card.power, 'Power');
  const colorName = card.color?.trim() || '—';

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.icon}>♥</Text>
        <View>
          <Text style={styles.label}>{isLeader ? 'VIDA' : 'COSTE'}</Text>
          <Text style={styles.value}>{lifeOrCost}</Text>
        </View>
      </View>
      <View style={styles.chip}>
        <Text style={styles.icon}>⚔</Text>
        <View>
          <Text style={styles.label}>PODER</Text>
          <Text style={styles.value}>{power}</Text>
        </View>
      </View>
      <View style={styles.chip}>
        <View style={[styles.dot, { backgroundColor: colorDot(colorName) }]} />
        <View>
          <Text style={styles.label}>COLOR</Text>
          <Text style={styles.value} numberOfLines={1}>
            {colorName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 100,
    flexGrow: 1,
  },
  icon: { fontSize: 18, opacity: 0.85 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#e8b923',
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dce8f4',
  },
});
