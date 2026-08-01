import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { bountyFromProgress, formatBounty } from '../utils/bounty';

interface BountyProgressHeroProps {
  ownedCount: number;
  totalCatalog: number;
  /** Sum of TCGplayer market prices (USD) for owned cards × quantity. */
  bountyUsd?: number;
  pricesLoading?: boolean;
}

export function BountyProgressHero({
  ownedCount,
  totalCatalog,
  bountyUsd,
  pricesLoading = false,
}: BountyProgressHeroProps) {
  const pct = totalCatalog ? Math.round((ownedCount / totalCatalog) * 1000) / 10 : 0;
  const useMarket = bountyUsd != null && ownedCount > 0;
  const bounty = useMarket
    ? pricesLoading && bountyUsd === 0
      ? '฿ …'
      : formatBounty(bountyUsd)
    : formatBounty(bountyFromProgress(ownedCount, totalCatalog));

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.top}>
        <View>
          <Text style={styles.label}>WANTED · COLLECTION BOUNTY</Text>
          <Text style={styles.bounty}>{bounty}</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statsLabel}>Cards owned</Text>
          <Text style={styles.statsValue}>{ownedCount.toLocaleString()}</Text>
          <Text style={styles.statsPct}>{pct}% of catalog</Text>
        </View>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.goldInk,
  },
  bounty: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.goldInk,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  stats: { alignItems: 'flex-end' },
  statsLabel: { fontSize: 11, color: colors.textMuted },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  statsPct: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  track: {
    marginTop: spacing.md,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.gold,
    minWidth: 2,
  },
});
