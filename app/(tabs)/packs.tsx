import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CardImage } from '../../src/components/CardImage';
import { PackOpeningOverlay } from '../../src/components/packs/PackOpeningOverlay';
import { colors, radii, spacing } from '../../src/constants/theme';
import { usePackCollection } from '../../src/context/PackCollectionContext';
import { useImageRegion } from '../../src/context/ImageRegionContext';
import { useCatalogCards } from '../../src/hooks/useCatalogCards';
import { usePackEnergy } from '../../src/hooks/usePackEnergy';
import { CatalogPagination } from '../../src/components/CatalogPagination';
import { getPageSlice, getTotalPages } from '../../src/utils/catalogGrid';
import { PackCarousel } from '../../src/components/packs/PackCarousel';
import { SetProgressRow } from '../../src/components/SetProgressRow';
import { Panel, PirateButton, SectionHeading, StatBox } from '../../src/components/ui';
import { hasBoosterArt } from '../../src/utils/boosterImages';
import { buildPacks, buildPromoPack, PITY_THRESHOLD, rollPack, type PulledCard } from '../../src/utils/packs';
import { getRarityBadgeColors, getRarityBadgeLabel } from '../../src/utils/rarity';

/** Cartas por página en la lista de cartas posibles. */
const POSSIBLE_PAGE_SIZE = 60;

/**
 * Variedad mínima para que un sobre sirva de primera impresión. PRB-02 solo
 * tiene 18 cartas base y reparte 12, así que casi todo sale repetido y parece
 * que abrir no hace nada. Sigue disponible en el carrusel, pero no de entrada.
 */
const MIN_VARIETY_FOR_DEFAULT = 40;

export default function PacksScreen() {
  const { cards, loading: catalogLoading } = useCatalogCards();
  const {
    packCollection,
    addPackCards,
    packList,
    totalCopies,
    hasCard,
    loading: packLoading,
  } = usePackCollection();
  // Se conserva solo el registro de aperturas: alimenta el contador de pity.
  const { state: energy, loading: energyLoading, recordOpening } = usePackEnergy();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pulled, setPulled] = useState<PulledCard[] | null>(null);
  const [openedLabel, setOpenedLabel] = useState<string | null>(null);
  /**
   * Tirada hecha pero aún sin confirmar. El pity y el recuento de aperturas
   * solo cuentan si las cartas acaban en la colección: registrarlos al tirar
   * permitía quemar el pity cerrando la apertura sin quedarse nada.
   */
  const [pendingOpening, setPendingOpening] = useState<{
    packId: string;
    since: number;
    packCount: number;
  } | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Solo sobres con arte: sin ella la ficha queda a medias (p. ej. EB-04).
  // El de promos va al final: no es una expansión, es el cajón de sastre.
  const packs = useMemo(() => {
    const boosters = buildPacks(cards).filter((pack) => hasBoosterArt(pack.id));
    const promo = buildPromoPack(cards);
    return promo && hasBoosterArt(promo.id) ? [...boosters, promo] : boosters;
  }, [cards]);
  const defaultIndex = useMemo(() => {
    const varied = packs.findIndex(
      (pack) => pack.baseCards.length >= MIN_VARIETY_FOR_DEFAULT
    );
    return varied >= 0 ? varied : 0;
  }, [packs]);

  const selectedIndex = useMemo(() => {
    const found = packs.findIndex((pack) => pack.id === selectedId);
    return found >= 0 ? found : defaultIndex;
  }, [defaultIndex, packs, selectedId]);
  const selected = packs[selectedIndex] ?? null;

  /**
   * Fondo que cuenta para el progreso: el mismo del que reparte el sobre. El
   * de promos sortea sobre todas sus cartas, variantes incluidas, así que
   * medirlo solo con las base daba 3/135 mientras la fila de abajo iba por
   * 31/836.
   */
  const poolCards = useMemo(() => {
    if (!selected) return [];
    return selected.subSets ? selected.cards : selected.baseCards;
  }, [selected]);

  const ownedInPack = useMemo(
    () => poolCards.reduce((count, card) => (packCollection[card.id] ? count + 1 : count), 0),
    [packCollection, poolCards]
  );

  const open = useCallback(
    (packCount: number) => {
      if (!selected || !energy) return;

      const ownedIds = new Set(Object.keys(packCollection));
      let since = energy.packsSinceChase[selected.id] ?? 0;
      const all: PulledCard[] = [];

      for (let i = 0; i < packCount; i += 1) {
        const roll = rollPack(selected, { packsSinceChase: since, ownedIds });
        since = roll.packsSinceChase;
        for (const pull of roll.cards) {
          all.push(pull);
          // Dentro de una tirada múltiple, la segunda copia ya no es nueva.
          ownedIds.add(pull.card.id);
        }
      }

      setPendingOpening({ packId: selected.id, since, packCount });
      setLastMessage(null);
      setOpenedLabel(selected.label);
      setPulled(all);
    },
    [packCollection, energy, selected]
  );

  const commit = useCallback(async () => {
    if (!pulled) return;
    // De una sola escritura: con 25 sobres son 300 cartas y guardarlas una a
    // una dejaba la pantalla colgada.
    await addPackCards(pulled.map((pull) => pull.card));
    // Ahora sí: las cartas están guardadas, así que el pity y el contador de
    // aperturas pueden avanzar.
    if (pendingOpening) {
      recordOpening(pendingOpening.packId, pendingOpening.since, pendingOpening.packCount);
      setPendingOpening(null);
    }
    const newCount = pulled.filter((pull) => pull.isNew).length;
    const dupeCount = pulled.length - newCount;
    setPulled(null);
    // Se nombran las repetidas: si no, con un sobre de poca variedad parece
    // que el botón no ha hecho nada.
    const dupePart = dupeCount > 0 ? ` · ${dupeCount} repetida${dupeCount === 1 ? '' : 's'}` : '';
    const where = openedLabel ? ` en ${openedLabel}` : '';
    setLastMessage(
      newCount > 0
        ? `+${newCount} carta${newCount === 1 ? '' : 's'} nueva${newCount === 1 ? '' : 's'}${dupePart}${where}`
        : `Sin cartas nuevas${where} · ${dupeCount} repetida${dupeCount === 1 ? '' : 's'}`
    );
  }, [addPackCards, openedLabel, pendingOpening, pulled, recordOpening]);

  /** Cerrar sin quedarse las cartas: la tirada se descarta entera. */
  const discard = useCallback(() => {
    setPulled(null);
    setPendingOpening(null);
  }, []);

  if (catalogLoading || energyLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.goldBright} />
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sin sobres disponibles</Text>
        <Text style={styles.emptyText}>
          Sincroniza el catálogo desde la pestaña Catalog para desbloquear los boosters.
        </Text>
      </View>
    );
  }

  const progress = poolCards.length ? ownedInPack / poolCards.length : 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pack Simulator</Text>

        <View style={styles.stage}>
          <PackCarousel
            packs={packs}
            index={selectedIndex}
            onSelect={(id) => {
              setSelectedId(id);
              setShowOdds(false);
              // El aviso es de la apertura anterior: al cambiar de sobre
              // quedaría bajo una cabecera que no le corresponde.
              setLastMessage(null);
            }}
          />
        </View>

        <Panel crowned style={styles.hero}>
          <View style={styles.heroTitle}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{selected.label}</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={2}>
              {selected.name}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatBox
              compact
              label="Sobres abiertos"
              value={String(energy?.packsOpened[selected.id] ?? 0)}
              hint="En este sobre"
            />
            <StatBox
              compact
              label="Sin chase"
              value={String(energy?.packsSinceChase[selected.id] ?? 0)}
              hint={`Garantizado a los ${PITY_THRESHOLD}`}
            />
            <StatBox
              compact
              label={`Tu colección ${selected.label}`}
              value={String(ownedInPack)}
              suffix={`/${poolCards.length}`}
              progress={progress}
              style={styles.statBoxWide}
            />
          </View>

          <View style={styles.actions}>
            <PirateButton
              label="Abrir sobre"
              variant="gold"
              onPress={() => open(1)}
              style={styles.openBtn}
            />
          </View>

          <PirateButton
            label={showOdds ? 'Ocultar cartas posibles' : 'Ver cartas posibles'}
            variant="ghost"
            onPress={() => setShowOdds((prev) => !prev)}
            style={styles.oddsBtn}
          />

          {lastMessage ? <Text style={styles.message}>{lastMessage}</Text> : null}
        </Panel>

        {showOdds ? <PossibleCards pack={selected} ownedIds={packCollection} /> : null}

        <PackCollectionSection
          pack={selected}
          packCollection={packCollection}
          hasCard={hasCard}
          uniqueCount={packList.length}
          totalCopies={totalCopies}
          loading={packLoading}
        />
      </ScrollView>

      {pulled ? (
        <PackOpeningOverlay
          cards={pulled}
          packId={selected.id}
          packLabel={selected.label}
          packName={selected.name}
          onCommit={commit}
          onDismiss={discard}
        />
      ) : null}
    </View>
  );
}

/**
 * Cartas obtenidas en el simulador. Van aquí y no en la pestaña Collection,
 * que representa lo que tienes en físico.
 */
/**
 * Colección del sobre seleccionado, con la misma rejilla numerada que Sets pero
 * contando solo lo abierto en el simulador. Muestra el sobre en pantalla, no la
 * lista de todos: antes aparecían filas de sobres que no estabas mirando.
 */
function PackCollectionSection({
  pack,
  packCollection,
  hasCard,
  uniqueCount,
  totalCopies,
  loading,
}: {
  pack: ReturnType<typeof buildPacks>[number];
  packCollection: Record<string, unknown>;
  hasCard: (cardId: string) => boolean;
  uniqueCount: number;
  totalCopies: number;
  loading: boolean;
}) {
  const owned = useMemo(
    () => pack.baseCards.reduce((n, card) => (hasCard(card.id) ? n + 1 : n), 0),
    [pack, hasCard]
  );

  const copiesHere = useMemo(() => {
    const prefix = `${pack.id.toUpperCase()}-`;
    return Object.entries(packCollection).reduce((sum, [id, entry]) => {
      if (!id.toUpperCase().startsWith(prefix)) return sum;
      return sum + ((entry as { quantity?: number }).quantity ?? 1);
    }, 0);
  }, [pack, packCollection]);

  return (
    <Panel style={styles.packCollection}>
      <SectionHeading
        title={`Colección ${pack.label}`}
        meta={`${owned} únicas · ${copiesHere} copias`}
        style={styles.oddsHeading}
      />
      <Text style={styles.packCollectionHint}>
        Solo cartas abiertas aquí. En total llevas {uniqueCount} únicas y {totalCopies} copias
        entre todos los sobres.
      </Text>
      {loading ? (
        // Sin esto se pintan ceros durante la carga y parece que no hay nada.
        <ActivityIndicator color={colors.goldInk} />
      ) : pack.subSets ? (
        // El sobre agrupa varias colecciones: una fila por cada una, igual que
        // se ven en la pestaña Sets.
        pack.subSets.map((group) => (
          <SetProgressRow
            key={group.name}
            setName={group.name}
            displayName={group.name}
            codeOverride={pack.label}
            artKey={pack.id}
            owned={group.cards.reduce((n, card) => (hasCard(card.id) ? n + 1 : n), 0)}
            total={group.cards.length}
            cards={group.cards}
            isInCollection={hasCard}
            onPress={() => {}}
          />
        ))
      ) : (
        <SetProgressRow
          setName={pack.name}
          displayName={pack.name}
          codeOverride={pack.label}
          owned={owned}
          total={pack.baseCards.length}
          cards={pack.baseCards}
          isInCollection={hasCard}
          onPress={() => {}}
        />
      )}
    </Panel>
  );
}

function PossibleCards({
  pack,
  ownedIds,
}: {
  pack: ReturnType<typeof buildPacks>[number];
  ownedIds: Record<string, unknown>;
}) {
  const { getDisplayImageUri } = useImageRegion();

  // El de promos reparte de todo su fondo; los boosters, de su numeración
  // base, que es su lista de comprobación.
  const possible = pack.subSets ? pack.cards : pack.baseCards;

  // El promo llega a 548 cartas y la rejilla no está virtualizada: se pagina.
  const [page, setPage] = useState(1);
  const totalPages = getTotalPages(possible.length, POSSIBLE_PAGE_SIZE);
  const pageCards = useMemo(
    () => getPageSlice(possible, page, POSSIBLE_PAGE_SIZE),
    [possible, page]
  );

  // Al cambiar de sobre la página anterior podría no existir.
  useEffect(() => {
    setPage(1);
  }, [pack.id]);

  return (
    <Panel style={styles.oddsPanel}>
      <SectionHeading
        title={`Cartas en ${pack.label}`}
        meta={`${possible.length} cartas`}
        style={styles.oddsHeading}
      />
      {totalPages > 1 ? (
        <CatalogPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : null}
      <View style={styles.oddsGrid}>
        {pageCards.map((card) => {
          const owned = Boolean(ownedIds[card.id]);
          const uri = getDisplayImageUri(card);
          const rarityLabel = getRarityBadgeLabel(card.rarity);
          const badgeColors = getRarityBadgeColors(card.rarity);
          return (
            <View key={card.id} style={[styles.oddsItem, !owned && styles.oddsItemMissing]}>
              {uri ? (
                <CardImage
                  uri={uri}
                  fallbackUri={card.images?.small || card.images?.large}
                  width={80}
                  height={112}
                  priority="low"
                  recyclingKey={card.id}
                />
              ) : (
                <View style={styles.oddsPlaceholder}>
                  <Text>🃏</Text>
                </View>
              )}
              {rarityLabel ? (
                <View
                  style={[styles.oddsBadge, { backgroundColor: badgeColors.backgroundColor }]}
                >
                  <Text style={[styles.oddsBadgeText, { color: badgeColors.color }]}>
                    {rarityLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 420,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  heading: {
    color: colors.goldInk,
    fontSize: 19,
    fontWeight: '900',
  },
  hero: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stage: {
    borderRadius: radii.lg,
    backgroundColor: colors.gridPanel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  /** Sello y nombre en la misma línea: antes se comían dos. */
  heroTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  heroBadgeText: {
    color: colors.goldInk,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBoxWide: {
    minWidth: 170,
    flexGrow: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  openBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  oddsBtn: {
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  message: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  packCollection: {
    marginTop: spacing.sm,
  },
  packCollectionHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  oddsHeading: {
    marginBottom: spacing.sm,
  },
  oddsPanel: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  oddsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  oddsItem: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  oddsItemMissing: {
    opacity: 0.35,
  },
  oddsPlaceholder: {
    width: 80,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gridPanel,
  },
  oddsBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  oddsBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
});
