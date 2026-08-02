import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { getOfficialCatalogMeta } from '../../src/api/official';
import { RegionFilter } from '../../src/components/RegionFilter';
import { colors, radii, spacing } from '../../src/constants/theme';
import { useCollection } from '../../src/context/CollectionContext';
import { useCollectionBounty } from '../../src/context/CollectionBountyContext';
import { useCatalogCards } from '../../src/hooks/useCatalogCards';
import { getCacheMeta } from '../../src/storage/collection';
import { Panel, PirateButton, SectionHeading, StatBox } from '../../src/components/ui';
import { formatBounty } from '../../src/utils/bounty';
import { isRareRarity } from '../../src/utils/rarity';

export default function ProfileScreen() {
  const router = useRouter();
  const { collectionList, totalCards, clearAll, loading: collectionLoading } = useCollection();
  const { bountyUsd } = useCollectionBounty();
  const { cards, loading: catalogLoading, refresh } = useCatalogCards();
  const [cacheSyncedAt, setCacheSyncedAt] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const loadMeta = useCallback(async () => {
    const meta = await getCacheMeta();
    setCacheSyncedAt(meta?.catalogSyncedAt ?? meta?.syncedAt ?? null);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta, cards.length]);
  const ownedUnique = collectionList.length;
  const bounty = formatBounty(bountyUsd);

  const rareOwned = useMemo(
    () => collectionList.filter((e) => isRareRarity(e.card.rarity)).length,
    [collectionList]
  );

  const setsTouched = useMemo(() => {
    const sets = new Set<string>();
    for (const entry of collectionList) {
      const name = entry.card.set?.name;
      if (name) sets.add(name);
    }
    return sets.size;
  }, [collectionList]);

  const officialMeta = getOfficialCatalogMeta();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  if (collectionLoading && catalogLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >

      <View style={styles.captain}>
        <Text style={styles.captainEmoji}>☠</Text>
        <View>
          <Text style={styles.captainTitle}>Captain&apos;s log</Text>
          <Text style={styles.captainSub}>Collection profile</Text>
        </View>
        <Text style={styles.bountyBadge}>{bounty}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatBox label="Unique cards" value={String(ownedUnique)} />
        <StatBox label="Total copies" value={String(totalCards)} />
        <StatBox label="Rare owned" value={String(rareOwned)} />
        <StatBox label="Sets started" value={String(setsTouched)} />
      </View>

      <Panel style={styles.section}>
        <SectionHeading title="Card images" style={styles.sectionHeading} />
        <RegionFilter />
      </Panel>

      <Panel style={styles.section}>
        <SectionHeading title="Catalog data" style={styles.sectionHeading} />
        <Text style={styles.metaLine}>
          Official cards: {officialMeta?.count?.toLocaleString() ?? '—'}
        </Text>
        <Text style={styles.metaLine}>
          Cached locally: {cards.length.toLocaleString()}
        </Text>
        <Text style={styles.metaLine}>
          Last sync:{' '}
          {cacheSyncedAt
            ? new Date(cacheSyncedAt).toLocaleString()
            : 'Not synced yet'}
        </Text>
        <Text style={styles.metaLine}>App version: {appVersion}</Text>
      </Panel>

      <PirateButton
        label={
          confirmingClear
            ? `Confirmar: borrar ${collectionList.length} cartas`
            : 'Vaciar mi colección'
        }
        variant={confirmingClear ? 'primary' : 'ghost'}
        onPress={() => {
          // Dos toques: vaciar no tiene deshacer.
          if (!confirmingClear) {
            setConfirmingClear(true);
            return;
          }
          void clearAll().then(() => setConfirmingClear(false));
        }}
      />

      <PirateButton
        label="↻ Refresh catalog cache"
        variant="primary"
        onPress={() => {
          void refresh().then(loadMeta);
        }}
      />

      <PirateButton
        label="Browse full catalog"
        variant="ghost"
        onPress={() => router.push('/(tabs)')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.lg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  captain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  captainEmoji: { fontSize: 36 },
  captainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  captainSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bountyBadge: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '800',
    color: colors.goldInk,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionHeading: {
    marginBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
    lineHeight: 18,
  },
});
