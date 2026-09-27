import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';
import {
  ART_FILTER_OPTIONS,
  COLOR_FILTER_OPTIONS,
  OWNED_FILTER_OPTIONS,
  RARITY_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  type CatalogFiltersState,
  type ChipFilterValue,
  type OwnedFilterValue,
} from '../../utils/cardFilters';
import type { CollectionFilterCounts } from '../../utils/collectionView';
import { getCardColorHex } from '../../utils/collectionView';
import { FamilyFilter } from '../FamilyFilter';

interface CollectionFiltersPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  ownedView: OwnedFilterValue;
  onOwnedViewChange: (value: OwnedFilterValue) => void;
  filters: CatalogFiltersState;
  onFiltersChange: (patch: Partial<CatalogFiltersState>) => void;
  filterCounts: CollectionFilterCounts;
  families: string[];
  familyCounts: Record<string, number>;
  poolCount: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  compact?: boolean;
}

const VIEW_LABELS: Record<OwnedFilterValue, string> = {
  all: 'All',
  owned: 'Owned',
  missing: 'Missing',
};

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  count,
  onPress,
  dotColor,
  disabled,
}: {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  dotColor?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        disabled && styles.chipDisabled,
        pressed && !disabled && styles.chipPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {dotColor ? <View style={[styles.colorDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

export function CollectionFiltersPanel({
  search,
  onSearchChange,
  ownedView,
  onOwnedViewChange,
  filters,
  onFiltersChange,
  filterCounts,
  families,
  familyCounts,
  poolCount,
  activeFilterCount,
  onClearFilters,
  compact,
}: CollectionFiltersPanelProps) {
  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Filters</Text>
        {activeFilterCount > 0 ? (
          <Pressable style={styles.clearBtn} onPress={onClearFilters}>
            <Text style={styles.clearBtnText}>Clear ({activeFilterCount})</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        // Apilado en movil el panel no debe capturar el gesto: lo hace la
        // pantalla entera, o quedan varias ventanitas que no dejan bajar.
        scrollEnabled={!compact}
      >
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.search}
            placeholder="Search cards..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable
              style={styles.searchClear}
              onPress={() => onSearchChange('')}
              accessibilityLabel="Clear search"
            >
              <Text style={styles.searchClearText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <FilterSection label="View">
          {OWNED_FILTER_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.id}
              label={VIEW_LABELS[opt.id as OwnedFilterValue]}
              active={ownedView === opt.id}
              onPress={() => onOwnedViewChange(opt.id as OwnedFilterValue)}
            />
          ))}
        </FilterSection>

        <FamilyFilter
          families={families}
          familyCounts={familyCounts}
          totalCount={poolCount}
          value={filters.family}
          onChange={(family) => onFiltersChange({ family })}
        />

        <FilterSection label="Type">
          {TYPE_FILTER_OPTIONS.map((opt) => {
            const count = filterCounts.type[opt.id] ?? 0;
            return (
              <FilterChip
                key={opt.id}
                label={opt.label}
                count={count}
                active={filters.cardType === opt.id}
                disabled={opt.id !== 'all' && count === 0}
                onPress={() => onFiltersChange({ cardType: opt.id as ChipFilterValue })}
              />
            );
          })}
        </FilterSection>

        <FilterSection label="Rarity">
          {RARITY_FILTER_OPTIONS.map((opt) => {
            const count = filterCounts.rarity[opt.id] ?? 0;
            return (
              <FilterChip
                key={opt.id}
                label={opt.label}
                count={count}
                active={filters.rarity === opt.id}
                disabled={opt.id !== 'all' && count === 0}
                onPress={() => onFiltersChange({ rarity: opt.id as ChipFilterValue })}
              />
            );
          })}
        </FilterSection>

        <FilterSection label="Arte">
          {ART_FILTER_OPTIONS.map((opt) => {
            const count = filterCounts.art[opt.id] ?? 0;
            return (
              <FilterChip
                key={opt.id}
                label={opt.label}
                count={count}
                active={filters.art === opt.id}
                disabled={opt.id !== 'all' && count === 0}
                onPress={() => onFiltersChange({ art: opt.id as ChipFilterValue })}
              />
            );
          })}
        </FilterSection>

        <FilterSection label="Color">
          {COLOR_FILTER_OPTIONS.map((opt) => {
            const count = filterCounts.color[opt.id] ?? 0;
            const dotColor = opt.id === 'all' ? undefined : getCardColorHex(opt.id);
            return (
              <FilterChip
                key={opt.id}
                label={opt.label}
                count={count}
                dotColor={dotColor}
                active={filters.color === opt.id}
                disabled={opt.id !== 'all' && count === 0}
                onPress={() => onFiltersChange({ color: opt.id as ChipFilterValue })}
              />
            );
          })}
        </FilterSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 252,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.gridPanel,
    paddingTop: spacing.md,
  },
  panelCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  panelTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearBtnText: {
    color: colors.goldInk,
    fontSize: 10,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  search: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  searchClearText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    alignSelf: 'flex-start',
  },
  chipActive: {
    backgroundColor: colors.bountyRed,
    borderColor: colors.bountyRed,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  chipCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.8,
  },
  chipCountActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
