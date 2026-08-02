import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { breakpoints, parchment as PARCHMENT, radii, spacing } from '../constants/theme';
import { useCollection } from '../context/CollectionContext';
import { useCollectionBounty } from '../context/CollectionBountyContext';
import { useCatalogCards } from '../hooks/useCatalogCards';
import { bountyFromProgress, formatBounty } from '../utils/bounty';

/** Alto de la barra: lo restan las pantallas que miden espacio disponible. */
export const BOTTOM_NAV_HEIGHT = 62;

const NAV_ITEMS = [
  { name: 'index', href: '/', label: 'Catalog', icon: 'cards-outline' },
  { name: 'packs', href: '/packs', label: 'Packs', icon: 'gift-outline' },
  { name: 'collection', href: '/collection', label: 'Collection', icon: 'star-outline' },
  { name: 'sets', href: '/sets', label: 'Sets', icon: 'map-outline' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'account-circle-outline' },
] as const;

function isItemActive(pathname: string, name: string): boolean {
  if (name === 'index') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(`/${name}`);
}

/**
 * Navegación en la parte inferior. Sustituye a la barra lateral, que se comía
 * 220 px de ancho en todas las pantallas. La recompensa viaja con ella para no
 * reaparecer como cabecera dentro del contenido.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const { bountyUsd, pricesLoading } = useCollectionBounty();
  const { collectionList } = useCollection();
  const { cards } = useCatalogCards();

  const ownedCount = collectionList.length;
  const pct = cards.length ? Math.round((ownedCount / cards.length) * 1000) / 10 : 0;
  const useMarket = bountyUsd != null && ownedCount > 0;
  const bountyText = useMarket
    ? pricesLoading && bountyUsd === 0
      ? '฿ …'
      : formatBounty(bountyUsd)
    : formatBounty(bountyFromProgress(ownedCount, cards.length));

  // En estrecho no cabe junto a cinco pestañas: manda la navegación.
  const showBounty = width >= breakpoints.compact;

  return (
    <View style={styles.bar}>
      {showBounty ? (
        <View style={styles.bounty}>
          <Text style={styles.bountyValue} numberOfLines={1}>
            {bountyText}
          </Text>
          <Text style={styles.bountyMeta} numberOfLines={1}>
            {ownedCount.toLocaleString()} cartas · {pct}%
          </Text>
        </View>
      ) : null}

      <View style={styles.items}>
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.name);
          return (
            <Pressable
              key={item.name}
              onPress={() => router.push(item.href as '/')}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                active && styles.itemActive,
                pressed && styles.itemPressed,
              ]}
            >
              <MaterialDesignIcons
                name={item.icon}
                size={22}
                color={active ? PARCHMENT.accent : PARCHMENT.inkSoft}
              />
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BOTTOM_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PARCHMENT.surface,
    borderTopWidth: 2,
    borderTopColor: PARCHMENT.edge,
    paddingHorizontal: spacing.sm,
  },
  bounty: {
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: PARCHMENT.rule,
    marginRight: spacing.sm,
  },
  bountyValue: {
    color: PARCHMENT.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  bountyMeta: {
    color: PARCHMENT.inkSoft,
    fontSize: 10,
  },
  items: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    maxWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  itemActive: {
    backgroundColor: PARCHMENT.accentWash,
  },
  itemPressed: { opacity: 0.7 },
  label: {
    color: PARCHMENT.inkSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  labelActive: {
    color: PARCHMENT.accent,
  },
});
