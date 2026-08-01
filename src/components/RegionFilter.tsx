import { StyleSheet, View } from 'react-native';
import { spacing } from '../constants/theme';
import { IMAGE_REGION_OPTIONS } from '../constants/regions';
import { useImageRegion } from '../context/ImageRegionContext';
import { FilterChipRow } from './FilterChipRow';

export function RegionFilter() {
  const { region, setRegion } = useImageRegion();

  return (
    <View style={styles.wrap}>
      <FilterChipRow
        label="Version (image only)"
        options={IMAGE_REGION_OPTIONS}
        value={region}
        onChange={(id) => {
          if (id === 'global' || id === 'japanese') setRegion(id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.12)',
    marginTop: spacing.xs,
  },
});
