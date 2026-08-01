import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { spacing } from '../constants/theme';

import {

  COLOR_FILTER_OPTIONS,

  ILLUSTRATION_FILTER_OPTIONS,

  OWNED_FILTER_OPTIONS,

  RARITY_FILTER_OPTIONS,

  TYPE_FILTER_OPTIONS,

  type CatalogFiltersState,

  type OwnedFilterValue,

} from '../utils/cardFilters';

import { FilterChipRow } from './FilterChipRow';



interface CatalogFiltersProps {

  filters: CatalogFiltersState;

  onChange: (patch: Partial<CatalogFiltersState>) => void;

}



export function CatalogFilters({ filters, onChange }: CatalogFiltersProps) {

  const { width } = useWindowDimensions();

  const twoColumns = width >= 760;



  const leftColumn = (

    <>

      <FilterChipRow

        label="Collection"

        options={OWNED_FILTER_OPTIONS}

        value={filters.owned}

        onChange={(owned) => onChange({ owned: owned as OwnedFilterValue })}

        compact

      />

      <FilterChipRow

        label="Card type"

        options={TYPE_FILTER_OPTIONS}

        value={filters.cardType}

        onChange={(cardType) => onChange({ cardType })}

        compact

      />

      <FilterChipRow

        label="Illustration"

        options={ILLUSTRATION_FILTER_OPTIONS}

        value={filters.illustration}

        onChange={(illustration) => onChange({ illustration })}

        compact

      />

    </>

  );



  const rightColumn = (

    <>

      <FilterChipRow

        label="Color"

        options={COLOR_FILTER_OPTIONS}

        value={filters.color}

        onChange={(color) => onChange({ color })}

        compact

      />

      <FilterChipRow

        label="Rarity"

        options={RARITY_FILTER_OPTIONS}

        value={filters.rarity}

        onChange={(rarity) => onChange({ rarity })}

        compact

      />

    </>

  );



  if (!twoColumns) {

    return (

      <View style={styles.wrap}>

        {leftColumn}

        {rightColumn}

      </View>

    );

  }



  return (

    <View style={styles.grid}>

      <View style={styles.column}>{leftColumn}</View>

      <View style={styles.divider} />

      <View style={styles.column}>{rightColumn}</View>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    gap: spacing.xs,

  },

  grid: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: spacing.md,

  },

  column: {

    flex: 1,

    minWidth: 0,

  },

  divider: {

    width: 1,

    alignSelf: 'stretch',

    backgroundColor: 'rgba(56, 189, 248, 0.12)',

    marginVertical: spacing.xs,

  },

});


