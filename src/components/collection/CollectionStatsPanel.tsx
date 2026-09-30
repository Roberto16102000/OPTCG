import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';
import { Panel, SectionHeading } from '../ui';
import type { CollectionEntry } from '../../types/card';
import { formatBounty } from '../../utils/bounty';
import { getPrimaryCardColor } from '../../utils/collectionView';
import { getRarityBadgeLabel, getRarityGlowColor } from '../../utils/rarity';
import { useImageRegion } from '../../context/ImageRegionContext';
import { CardImage } from '../CardImage';

interface CollectionStatsPanelProps {
  collectionList: CollectionEntry[];
  totalCopies: number;
  priceByCardId: Record<string, number>;
  compact?: boolean;
}

function countByType(entries: CollectionEntry[], type: string): number {
  return entries.filter((e) => e.card.type.toUpperCase() === type.toUpperCase()).length;
}

export function CollectionStatsPanel({
  collectionList,
  totalCopies,
  priceByCardId,
  compact,
}: CollectionStatsPanelProps) {
  const { getDisplayImageUri } = useImageRegion();

  const stats = useMemo(() => {
    const srCount = collectionList.filter((e) => e.card.rarity?.startsWith('SR')).length;
    const leaderCount = countByType(collectionList, 'Leader');
    const colorsSet = new Set(
      collectionList.map((e) => getPrimaryCardColor(e.card)).filter((c) => c !== '—')
    );
    const typesSet = new Set(collectionList.map((e) => e.card.type));
    return {
      srCount,
      leaderCount,
      colorCount: colorsSet.size,
      typeCount: typesSet.size,
    };
  }, [collectionList]);

  const mostValuable = useMemo(() => {
    let best = collectionList[0];
    let bestValue = 0;
    for (const entry of collectionList) {
      const unit = priceByCardId[entry.card.id] ?? 0;
      const total = unit * entry.quantity;
      if (total > bestValue) {
        bestValue = total;
        best = entry;
      }
    }
    return best ? { entry: best, value: bestValue } : null;
  }, [collectionList, priceByCardId]);

  const recentlyAdded = useMemo(() => {
    return [...collectionList]
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 3);
  }, [collectionList]);

  const Contenedor = compact ? View : ScrollView;

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      {/*
        Mismo caso que en el panel de filtros: apilado no se usa ScrollView,
        porque `scrollEnabled={false}` acaba en `touch-action: none` y bloquea
        el desplazamiento de la pantalla en vez de cederlo.
      */}
      <Contenedor
        {...(compact
          ? { style: styles.scroll }
          : { showsVerticalScrollIndicator: false, contentContainerStyle: styles.scroll })}
      >
        <Widget title="Collection Stats">
          <StatRow icon="🃏" label="Total Cards" value={String(totalCopies)} />
          <StatRow icon="✨" label="Unique Cards" value={String(collectionList.length)} />
          <StatRow icon="⭐" label="SR Cards" value={String(stats.srCount)} />
          <StatRow icon="👑" label="Leader Cards" value={String(stats.leaderCount)} />
          <StatRow icon="🎨" label="Colors" value={String(stats.colorCount)} />
          <StatRow icon="📋" label="Types" value={String(stats.typeCount)} />
        </Widget>

        {mostValuable ? (
          <Widget title="Most Valuable Card">
            <View style={styles.featuredCard}>
              <CardImage
                lazy
                uri={getDisplayImageUri(mostValuable.entry.card) ?? mostValuable.entry.card.images.small}
                fallbackUri={mostValuable.entry.card.images?.small}
                cardId={mostValuable.entry.card.id}
                width={56}
                height={78}
                recyclingKey={mostValuable.entry.card.id}
              />
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredName} numberOfLines={2}>
                  {mostValuable.entry.card.name}
                </Text>
                <Text style={styles.featuredCode}>{mostValuable.entry.card.code}</Text>
                <Text style={styles.featuredValue}>{formatBounty(mostValuable.value)}</Text>
              </View>
            </View>
          </Widget>
        ) : null}

        {recentlyAdded.length > 0 ? (
          <Widget title="Recently Added">
            {recentlyAdded.map((entry) => {
              const rarityLabel = getRarityBadgeLabel(entry.card.rarity) ?? '—';
              const rarityColor = getRarityGlowColor(entry.card.rarity) ?? colors.textMuted;
              return (
                <View key={entry.card.id} style={styles.recentRow}>
                  <CardImage
                    lazy
                    uri={getDisplayImageUri(entry.card) ?? entry.card.images.small}
                    fallbackUri={entry.card.images?.small}
                    cardId={entry.card.id}
                    width={36}
                    height={50}
                    recyclingKey={entry.card.id}
                  />
                  <View style={styles.recentMeta}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {entry.card.name}
                    </Text>
                    <Text style={styles.recentCode}>{entry.card.code}</Text>
                    <View style={styles.recentTags}>
                      <Text style={[styles.recentRarity, { color: rarityColor }]}>{rarityLabel}</Text>
                      <Text style={styles.recentColor}>{getPrimaryCardColor(entry.card)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Widget>
        ) : null}
      </Contenedor>
    </View>
  );
}

function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel style={styles.widget}>
      <SectionHeading title={title} style={styles.widgetTitle} />
      {children}
    </Panel>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 260,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.gridPanel,
    paddingTop: spacing.md,
  },
  panelCompact: {
    width: '100%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  widget: {
    marginBottom: spacing.sm,
  },
  widgetTitle: {
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  statIcon: {
    fontSize: 14,
    width: 24,
  },
  statLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: colors.goldInk,
    fontSize: 13,
    fontWeight: '700',
  },
  featuredCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  featuredMeta: {
    flex: 1,
    gap: 2,
  },
  featuredName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  featuredCode: {
    color: colors.textMuted,
    fontSize: 10,
  },
  featuredValue: {
    color: colors.goldInk,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  recentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  recentMeta: {
    flex: 1,
    gap: 1,
  },
  recentName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  recentCode: {
    color: colors.textMuted,
    fontSize: 10,
  },
  recentTags: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  recentRarity: {
    fontSize: 10,
    fontWeight: '800',
  },
  recentColor: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
