import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { formatBounty } from '../../utils/bounty';

interface CollectionHeaderProps {
  uniqueCount: number;
  totalCopies: number;
  catalogTotal: number;
  bountyUsd: number;
  pricesLoading: boolean;
}

export function CollectionHeader({
  uniqueCount,
  totalCopies,
  catalogTotal,
  bountyUsd,
  pricesLoading,
}: CollectionHeaderProps) {
  const completion = catalogTotal > 0 ? (uniqueCount / catalogTotal) * 100 : 0;
  const completionLabel = completion < 0.1 && uniqueCount > 0 ? completion.toFixed(1) : completion.toFixed(1);
  const progressPct = Math.min(completion, 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>MY COLLECTION</Text>
          <Text style={styles.subtitle}>Manage and explore your cards</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalCopies}</Text>
          <Text style={styles.statLabel}>Total Cards</Text>
          <Text style={styles.statHint}>{uniqueCount} unique</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completionLabel}%</Text>
          <Text style={styles.statLabel}>Completion</Text>
          <Text style={styles.statHint}>of catalog</Text>
        </View>
        <View style={styles.statBox}>
          {pricesLoading ? (
            <ActivityIndicator size="small" color={colors.gold} style={styles.valueLoader} />
          ) : (
            <Text style={[styles.statValue, styles.statValueGold]}>{formatBounty(bountyUsd)}</Text>
          )}
          <Text style={styles.statLabel}>Total Value</Text>
          <Text style={styles.statHint}>Est. value</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Collection progress</Text>
          <Text style={styles.progressPct}>{completionLabel}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  titleRow: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.goldInk,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: 110,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  statValueGold: {
    color: colors.goldInk,
  },
  statLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  statHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  valueLoader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  progressSection: {
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  progressPct: {
    color: colors.goldInk,
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
  },
});
