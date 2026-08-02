import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import { useFilterLayout } from './filters/FilterLayoutContext';

import type { ChipFilterValue } from '../utils/cardFilters';



export interface FilterOption {

  id: ChipFilterValue;

  label: string;

}



interface FilterChipRowProps {

  label: string;

  options: readonly FilterOption[];

  value: ChipFilterValue;

  onChange: (value: ChipFilterValue) => void;

  compact?: boolean;

}



export function FilterChipRow({ label, options, value, onChange, compact }: FilterChipRowProps) {

  const { width } = useWindowDimensions();

  const { stacked } = useFilterLayout();
  const sideBySide = !stacked && width >= 480;



  return (

    <View style={[styles.row, compact && styles.rowCompact, sideBySide && styles.rowInline]}>

      <Text style={[styles.label, sideBySide && styles.labelInline]}>{label}</Text>

      <View style={[styles.chips, sideBySide && styles.chipsInline]}>

        {options.map((opt) => {

          const active = value === opt.id;

          return (

            <Pressable

              key={opt.id}

              style={({ pressed }) => [

                styles.chip,

                active && styles.chipActive,

                pressed && styles.chipPressed,

              ]}

              onPress={() => onChange(opt.id)}

            >

              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>

            </Pressable>

          );

        })}

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  row: {

    marginBottom: spacing.md,

  },

  rowCompact: {

    marginBottom: spacing.sm,

  },

  rowInline: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: spacing.md,

  },

  label: {

    color: colors.textMuted,

    fontSize: 10,

    fontWeight: '700',

    letterSpacing: 0.8,

    textTransform: 'uppercase',

    marginBottom: spacing.xs,

  },

  labelInline: {

    width: 92,

    minWidth: 92,

    marginBottom: 0,

    paddingTop: 7,

    lineHeight: 14,

  },

  chips: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: spacing.xs,

  },

  chipsInline: {

    flex: 1,

    minWidth: 0,

  },

  chip: {

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: radii.pill,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.glass,

  },

  chipActive: {

    backgroundColor: colors.bountyRed,

    borderColor: colors.bountyRed,

  },

  chipPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },

  chipText: {

    color: colors.textMuted,

    fontSize: 12,

    fontWeight: '600',

  },

  chipTextActive: {

    color: '#fff',

    fontWeight: '700',

  },

});


