import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';
import type { CollectionSort } from '../../utils/collectionView';

const SORT_OPTIONS: { id: CollectionSort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'Name' },
  { id: 'code', label: 'Code' },
  { id: 'rarity', label: 'Rarity' },
];

interface CollectionGridToolbarProps {
  count: number;
  sort: CollectionSort;
  onSortChange: (sort: CollectionSort) => void;
}

export function CollectionGridToolbar({ count, sort, onSortChange }: CollectionGridToolbarProps) {
  const sortIndex = SORT_OPTIONS.findIndex((o) => o.id === sort);

  const cycleSort = () => {
    const next = SORT_OPTIONS[(sortIndex + 1) % SORT_OPTIONS.length];
    onSortChange(next.id);
  };

  return (
    <View style={styles.bar}>
      <Text style={styles.count}>
        {count} CARD{count !== 1 ? 'S' : ''}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.sortBtn} onPress={cycleSort}>
          <Text style={styles.sortLabel}>Sort by</Text>
          <Text style={styles.sortValue}>{SORT_OPTIONS[sortIndex]?.label ?? 'Recent'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.toolbarBg,
  },
  count: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  sortLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  sortValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
