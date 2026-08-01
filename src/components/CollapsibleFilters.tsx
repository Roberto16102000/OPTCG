import { useState, type ReactNode } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';

function FilterChevron({ expanded }: { expanded: boolean }) {
  return (
    <View style={[styles.chevronBox, expanded && styles.chevronBoxOpen]}>
      <View style={[styles.chevron, expanded && styles.chevronOpen]} />
    </View>
  );
}

interface CollapsibleFiltersProps {
  children: ReactNode;

  activeCount?: number;

}



export function CollapsibleFilters({ children, activeCount = 0 }: CollapsibleFiltersProps) {

  const [open, setOpen] = useState(false);



  return (

    <View style={styles.wrap}>

      <Pressable

        style={styles.toggle}

        onPress={() => setOpen((v) => !v)}

        accessibilityRole="button"

        accessibilityState={{ expanded: open }}

      >

        <View style={styles.toggleLeft}>

          <Text style={styles.toggleText}>Filters</Text>

          {activeCount > 0 && (

            <View style={styles.badge}>

              <Text style={styles.badgeText}>{activeCount}</Text>

            </View>

          )}

        </View>

        <FilterChevron expanded={open} />

      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    marginHorizontal: spacing.md,

    marginBottom: spacing.sm,

  },

  toggle: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: radii.md,

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

  },

  toggleLeft: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

  },

  toggleText: {

    fontSize: 13,

    fontWeight: '700',

    color: colors.text,

  },

  badge: {

    minWidth: 20,

    height: 20,

    borderRadius: 10,

    backgroundColor: colors.bountyRed,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 6,

  },

  badgeText: {

    color: '#fff',

    fontSize: 11,

    fontWeight: '800',

  },

  chevronBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 185, 35, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 185, 35, 0.35)',
  },
  chevronBoxOpen: {
    backgroundColor: 'rgba(196, 30, 58, 0.2)',
    borderColor: 'rgba(196, 30, 58, 0.45)',
  },
  chevron: {
    width: 7,
    height: 7,
    marginTop: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  chevronOpen: {
    marginTop: -2,
    borderColor: colors.strawRed,
    transform: [{ rotate: '-135deg' }],
  },

  body: {

    marginTop: spacing.sm,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.md,

    borderRadius: radii.lg,

    backgroundColor: colors.surfaceSunken,

    borderWidth: 1,

    borderColor: colors.border,

    gap: spacing.sm,

  },

});


