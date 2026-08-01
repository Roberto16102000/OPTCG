import { useRouter } from 'expo-router';
import { queueSetFilter } from '../../src/utils/pendingSetFilter';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SetProgressRow } from '../../src/components/SetProgressRow';
import type { OnePieceCard } from '../../src/types/card';
import { colors, radii, spacing } from '../../src/constants/theme';
import { SectionHeading } from '../../src/components/ui';
import { useCollection } from '../../src/context/CollectionContext';
import { useCatalogCards } from '../../src/hooks/useCatalogCards';
import {
  formatSetDisplayName,
  getCardSetName,
  getSetCodeFromName,
  sortSetNames,
} from '../../src/utils/cards';

interface SetStat {
  setName: string;
  total: number;
  owned: number;
  /** Carta que representa al set cuando no hay arte de producto. */
  cover: OnePieceCard | null;
}

export default function SetsScreen() {
  const router = useRouter();
  const { cards, loading } = useCatalogCards();
  const { isInCollection } = useCollection();
  const [query, setQuery] = useState('');

  const setStats = useMemo(() => {
    const map = new Map<string, SetStat>();
    for (const card of cards) {
      const setName = getCardSetName(card);
      if (!setName) continue;
      const entry = map.get(setName) ?? { setName, total: 0, owned: 0, cover: null };
      entry.total += 1;
      if (isInCollection(card.id)) entry.owned += 1;
      // El líder manda; si no lo hay, vale la primera carta base del set.
      const isBase = card.id === card.code;
      if (isBase && (!entry.cover || (card.type === 'LEADER' && entry.cover.type !== 'LEADER'))) {
        entry.cover = card;
      }
      map.set(setName, entry);
    }
    return sortSetNames([...map.keys()]).map((name) => map.get(name)!);
  }, [cards, isInCollection]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return setStats;
    return setStats.filter((s) => {
      const display = formatSetDisplayName(s.setName).toLowerCase();
      const code = getSetCodeFromName(s.setName)?.toLowerCase() ?? '';
      return display.includes(q) || code.includes(q) || s.setName.toLowerCase().includes(q);
    });
  }, [setStats, query]);

  const setsWithProgress = setStats.filter((s) => s.owned > 0).length;

  const openSetInCatalog = (setName: string) => {
    queueSetFilter(setName);
    router.push('/');
  };

  if (loading && !cards.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading sets…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionHeading
        title="Expansions"
        meta={`${setStats.length} sets · ${setsWithProgress} en curso`}
        style={styles.summary}
      />
      <TextInput
        style={styles.search}
        placeholder="Search sets (OP-01, ST-30…)"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.setName}
        renderItem={({ item }) => (
          <SetProgressRow
            setName={item.setName}
            owned={item.owned}
            total={item.total}
            cover={item.cover}
            onPress={() => openSetInCatalog(item.setName)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {cards.length === 0
              ? 'Sync the catalog first to see sets.'
              : 'No sets match your search.'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: spacing.lg, paddingTop: spacing.xs }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: { color: colors.textMuted },
  summary: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    color: colors.text,
    fontSize: 15,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
