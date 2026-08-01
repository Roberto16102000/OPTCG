import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePathname, useRouter } from 'expo-router';

import { useCallback, useEffect, useState } from 'react';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, parchment as PARCHMENT, radii, spacing } from '../constants/theme';
import { useCollection } from '../context/CollectionContext';
import { useCollectionBounty } from '../context/CollectionBountyContext';
import { useCatalogCards } from '../hooks/useCatalogCards';
import { bountyFromProgress, formatBounty } from '../utils/bounty';



const STORAGE_KEY = '@onepiece/sidebar_open';

export const SIDEBAR_WIDTH = 220;

export const SIDEBAR_COLLAPSED_WIDTH = 56;



const NAV_ITEMS = [

  { name: 'index', href: '/', label: 'Catalog', icon: 'cards-outline' },

  { name: 'packs', href: '/packs', label: 'Packs', icon: 'gift-outline' },

  { name: 'collection', href: '/collection', label: 'Collection', icon: 'star-outline' },

  { name: 'sets', href: '/sets', label: 'Sets', icon: 'map-outline' },

  { name: 'profile', href: '/profile', label: 'Profile', icon: 'account-circle-outline' },

] as const;



function isItemActive(pathname: string, name: string): boolean {

  const normalized = pathname.replace(/\/$/, '') || '/';

  if (name === 'index') {

    return normalized === '/' || normalized === '/index' || normalized.endsWith('/(tabs)');

  }

  return normalized === `/${name}` || normalized.endsWith(`/${name}`);

}



export function SidebarNav() {

  const router = useRouter();

  const pathname = usePathname();

  const { bountyUsd, pricesLoading } = useCollectionBounty();

  const { collectionList } = useCollection();

  const { cards } = useCatalogCards();

  const ownedCount = collectionList.length;

  const bountyPct = cards.length ? Math.round((ownedCount / cards.length) * 1000) / 10 : 0;

  const useMarket = bountyUsd != null && ownedCount > 0;

  const bountyText = useMarket
    ? pricesLoading && bountyUsd === 0
      ? '฿ …'
      : formatBounty(bountyUsd)
    : formatBounty(bountyFromProgress(ownedCount, cards.length));

  const [open, setOpen] = useState(true);



  useEffect(() => {

    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {

      if (raw === '0') setOpen(false);

      if (raw === '1') setOpen(true);

    });

  }, []);



  const toggle = useCallback((next: boolean) => {

    setOpen(next);

    AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');

  }, []);



  if (!open) {

    return (

      <View style={styles.collapsedRail}>

        <Pressable

          onPress={() => toggle(true)}

          style={({ pressed }) => [styles.railBtn, pressed && styles.railBtnPressed]}

          accessibilityLabel="Expandir menú"

        >

          <Text style={styles.railBtnIcon}>☰</Text>

        </Pressable>

        <View style={styles.collapsedNav}>

          {NAV_ITEMS.map((item) => {

            const active = isItemActive(pathname, item.name);

            return (

              <Pressable

                key={item.name}

                onPress={() => router.push(item.href as '/')}

                style={({ pressed }) => [

                  styles.railBtn,

                  active && styles.railBtnActive,

                  pressed && styles.railBtnPressed,

                ]}

                accessibilityRole="button"

                accessibilityLabel={item.label}

                accessibilityState={{ selected: active }}

              >

                <MaterialDesignIcons
                  name={item.icon}
                  size={20}
                  color={active ? PARCHMENT.accent : PARCHMENT.inkSoft}
                />

              </Pressable>

            );

          })}

        </View>

      </View>

    );

  }



  return (

    <View style={styles.wrap}>

      <View style={styles.sidebar}>

        <Text style={styles.brand}>ONE PIECE TCG</Text>

        <View style={styles.nav}>

          {NAV_ITEMS.map((item) => {

            const active = isItemActive(pathname, item.name);

            return (

              <Pressable

                key={item.name}

                onPress={() => router.push(item.href as '/')}

                style={({ pressed }) => [

                  styles.navItem,

                  active && styles.navItemActive,

                  pressed && styles.navItemPressed,

                ]}

                accessibilityRole="button"

                accessibilityState={{ selected: active }}

              >

                {active ? <View style={styles.activeMarker} /> : null}

                <MaterialDesignIcons
                  name={item.icon}
                  size={20}
                  color={active ? PARCHMENT.accent : PARCHMENT.inkSoft}
                  style={styles.navEmoji}
                />

                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>

              </Pressable>

            );

          })}

        </View>

        <View style={styles.bounty}>

          <Text style={styles.bountyLabel}>WANTED · RECOMPENSA</Text>

          <Text style={styles.bountyValue}>{bountyText}</Text>

          <View style={styles.bountyTrack}>

            <View style={[styles.bountyFill, { width: `${Math.min(bountyPct, 100)}%` }]} />

          </View>

          <Text style={styles.bountyMeta}>

            {ownedCount.toLocaleString()} cartas · {bountyPct}% del catálogo

          </Text>

        </View>

        <Pressable

          onPress={() => toggle(false)}

          style={({ pressed }) => [styles.collapseBtn, pressed && styles.navItemPressed]}

          accessibilityLabel="Ocultar menú"

        >

          <Text style={styles.collapseIcon}>◀</Text>

          <Text style={styles.collapseLabel}>Ocultar</Text>

        </Pressable>

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    width: SIDEBAR_WIDTH,

    zIndex: 20,

  },

  collapsedRail: {

    width: SIDEBAR_COLLAPSED_WIDTH,

    alignItems: 'center',

    paddingTop: Platform.OS === 'web' ? spacing.md : spacing.lg,

    paddingBottom: spacing.md,

    gap: spacing.sm,

    borderRightWidth: 1,

    borderRightColor: PARCHMENT.edge,

    backgroundColor: PARCHMENT.surface,

    zIndex: 20,

    ...Platform.select({

      web: { minHeight: '100vh' as unknown as number },

      default: {},

    }),

  },

  collapsedNav: {

    alignItems: 'center',

    gap: spacing.xs,

    width: '100%',

  },

  railBtn: {

    width: 40,

    height: 40,

    borderRadius: radii.md,

    backgroundColor: PARCHMENT.surfaceRaised,

    borderWidth: 1,

    borderColor: colors.border,

    alignItems: 'center',

    justifyContent: 'center',

  },

  railBtnActive: {

    backgroundColor: PARCHMENT.accentWash,

    borderColor: PARCHMENT.accent,

  },

  railBtnPressed: {

    opacity: 0.85,

    backgroundColor: PARCHMENT.surfaceRaised,

  },

  railBtnIcon: {

    fontSize: 18,

    color: PARCHMENT.ink,

  },

  railNavEmoji: {

    fontSize: 18,

  },

  railNavEmojiActive: {

    opacity: 1,

  },

  sidebar: {

    width: SIDEBAR_WIDTH,

    backgroundColor: PARCHMENT.surface,

    borderRightWidth: 1,

    borderRightColor: PARCHMENT.edge,

    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.xl,

    paddingHorizontal: spacing.sm,

    paddingBottom: spacing.md,

    justifyContent: 'flex-start',

    ...Platform.select({

      web: { minHeight: '100vh' as unknown as number },

      default: {},

    }),

  },

  brand: {

    color: PARCHMENT.ink,

    fontSize: 12,

    fontWeight: '800',

    letterSpacing: 1.2,

    textAlign: 'center',

    marginBottom: spacing.lg,

    paddingHorizontal: spacing.xs,

  },

  nav: {

    flex: 1,

    gap: spacing.xs,

  },

  navItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    paddingVertical: spacing.sm + 2,

    paddingHorizontal: spacing.md,

    borderRadius: radii.md,

  },

  navItemActive: {

    backgroundColor: PARCHMENT.accentWash,

  },

  bounty: {

    marginTop: spacing.sm,

    paddingTop: spacing.sm,

    marginHorizontal: spacing.md,

    borderTopWidth: 1,

    borderTopColor: PARCHMENT.rule,

  },

  bountyLabel: {

    color: PARCHMENT.inkSoft,

    fontSize: 10,

    fontWeight: '700',

    letterSpacing: 0.8,

  },

  bountyValue: {

    color: PARCHMENT.accent,

    fontSize: 16,

    fontWeight: '900',

  },

  bountyTrack: {

    height: 4,

    borderRadius: 2,

    marginTop: 6,

    overflow: 'hidden',

    backgroundColor: 'rgba(92, 61, 33, 0.18)',

  },

  bountyMeta: {

    color: PARCHMENT.inkSoft,

    fontSize: 10,

    marginTop: 5,

  },

  bountyFill: {

    height: '100%',

    backgroundColor: PARCHMENT.gold,

  },

  activeMarker: {

    position: 'absolute',

    left: 0,

    top: 8,

    bottom: 8,

    width: 3,

    borderRadius: 2,

    backgroundColor: PARCHMENT.accent,

  },

  navItemPressed: {

    opacity: 0.85,

  },

  navEmoji: {

    fontSize: 20,

    width: 28,

    textAlign: 'center',

  },

  navLabel: {

    color: PARCHMENT.inkSoft,

    fontSize: 14,

    fontWeight: '700',

  },

  navLabelActive: {

    color: PARCHMENT.ink,

  },

  collapseBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    paddingVertical: spacing.sm,

    paddingHorizontal: spacing.md,

    borderRadius: radii.md,

    borderTopWidth: 1,

    borderTopColor: colors.border,

    marginTop: spacing.sm,

  },

  collapseIcon: {

    color: PARCHMENT.inkSoft,

    fontSize: 12,

    width: 28,

    textAlign: 'center',

  },

  collapseLabel: {

    color: PARCHMENT.inkSoft,

    fontSize: 12,

    fontWeight: '600',

  },

});


