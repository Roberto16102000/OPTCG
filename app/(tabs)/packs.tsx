import { useCallback, useMemo, useState } from 'react';
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
import { formatCountdown, MAX_FREE_CHARGES } from '../../src/storage/packEnergy';
import { PackCarousel } from '../../src/components/packs/PackCarousel';
import { SetProgressRow } from '../../src/components/SetProgressRow';
import { Panel, PirateButton, SectionHeading, StatBox } from '../../src/components/ui';
import { hasBoosterArt } from '../../src/utils/boosterImages';
import { buildPacks, buildPromoPack, rollPack, type PulledCard } from '../../src/utils/packs';
import { getRarityBadgeColors, getRarityBadgeLabel } from '../../src/utils/rarity';

const MULTI_OPEN = 5;

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
    addPackCard,
    packList,
    totalCopies,
    hasCard,
    loading: packLoading,
  } = usePackCollection();
  const {
    state: energy,
    loading: energyLoading,
    freeCharges,
    extraTokens,
    totalCharges,
    secondsToNext,
    spend,
    recordOpening,
  } = usePackEnergy();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pulled, setPulled] = useState<PulledCard[] | null>(null);
  const [openedLabel, setOpenedLabel] = useState<string | null>(null);
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

  const ownedInPack = useMemo(() => {
    if (!selected) return 0;
    return selected.baseCards.reduce(
      (count, card) => (packCollection[card.id] ? count + 1 : count),
      0
    );
  }, [packCollection, selected]);

  const open = useCallback(
    (packCount: number) => {
      if (!selected || !energy) return;
      const result = spend(packCount);
      if (!result.ok) {
        setLastMessage('No te quedan sobres. Espera a que recarguen.');
        return;
      }

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

      recordOpening(selected.id, since, packCount);
      setLastMessage(null);
      setOpenedLabel(selected.label);
      setPulled(all);
    },
    [packCollection, energy, recordOpening, selected, spend]
  );

  const commit = useCallback(async () => {
    if (!pulled) return;
    for (const pull of pulled) {
      await addPackCard(pull.card);
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
  }, [addPackCard, openedLabel, pulled]);

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

  const progress = selected.baseCards.length
    ? ownedInPack / selected.baseCards.length
    : 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{selected.label}</Text>
          </View>
          <Text style={styles.heroName}>{selected.name}</Text>

          <View style={styles.statsRow}>
            <StatBox
              label="Paquetes diarios"
              value={String(freeCharges)}
              suffix={`/${MAX_FREE_CHARGES}`}
              hint={
                freeCharges >= MAX_FREE_CHARGES
                  ? 'Al máximo'
                  : `Recarga en ${formatCountdown(secondsToNext)}`
              }
            />
            <StatBox
              label="Paquetes extra"
              value={`x${extraTokens}`}
              hint="No se recargan"
            />
            <StatBox
              label={`Tu colección ${selected.label}`}
              value={String(ownedInPack)}
              suffix={`/${selected.baseCards.length}`}
              progress={progress}
              style={styles.statBoxWide}
            />
          </View>

          <View style={styles.actions}>
            <PirateButton
              label="Open 1"
              variant="gold"
              size="lg"
              onPress={() => open(1)}
              disabled={totalCharges < 1}
              style={styles.openBtn}
            />
            {totalCharges >= MULTI_OPEN ? (
              <PirateButton
                label={`Open ${MULTI_OPEN}`}
                variant="primary"
                size="lg"
                onPress={() => open(MULTI_OPEN)}
                style={styles.openBtn}
              />
            ) : null}
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
          onDismiss={() => setPulled(null)}
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

  return (
    <Panel style={styles.oddsPanel}>
      <SectionHeading
        title={`Cartas en ${pack.label}`}
        meta={`${pack.baseCards.length} cartas`}
        style={styles.oddsHeading}
      />
      <View style={styles.oddsGrid}>
        {pack.baseCards.map((card) => {
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
    fontSize: 26,
    fontWeight: '900',
  },
  hero: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stage: {
    borderRadius: radii.lg,
    backgroundColor: colors.gridPanel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  heroBadgeText: {
    color: colors.goldInk,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBoxWide: {
    minWidth: 220,
    flexGrow: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  openBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  oddsBtn: {
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  message: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  packCollection: {
    marginTop: spacing.sm,
  },
  packCollectionHint: {
    color: colors.textMuted,
    fontSize: 12,
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
