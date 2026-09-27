import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { breakpoints, colors, radii, spacing, typography } from '../../constants/theme';
import { useImageRegion } from '../../context/ImageRegionContext';
import type { OnePieceCard } from '../../types/card';
import {
  applyCatalogFilters,
  ART_FILTER_OPTIONS,
  cardMatchesSearch,
  COLOR_FILTER_OPTIONS,
  RARITY_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  type CatalogFiltersState,
} from '../../utils/cardFilters';
import { compareCards, formatSetDisplayName } from '../../utils/cards';
import { CardImage } from '../CardImage';
import { PirateButton } from '../ui';
import { getPickerGrid, PICKER_TILE_CHROME } from '../../utils/responsiveLayout';

/** Sin tope, teclear una letra intentaría pintar miles de resultados. */
const PAGE_SIZE = 80;
const FILTERS_WIDTH = 190;
const SELECTED_WIDTH = 240;
/** Alto del control de la ficha: el botón y el stepper deben coincidir o la
 *  fila se descuadra al seleccionar. */
const ACTION_HEIGHT = 26;
const LINE_HEIGHT = 14;

const NO_FILTERS: CatalogFiltersState = {
  color: 'all',
  cardType: 'all',
  illustration: 'all',
  art: 'all',
  rarity: 'all',
  family: 'all',
  owned: 'all',
};

type SortId = 'code' | 'name' | 'rarity';
const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'code', label: 'Catálogo' },
  { id: 'name', label: 'Nombre' },
  { id: 'rarity', label: 'Rareza' },
];

/** De más común a más rara, para que el orden tenga sentido de lectura. */
const RARITY_ORDER = ['C', 'UC', 'R', 'SR', 'L', 'SEC', 'SP CARD', 'TR', 'P'];

interface CardPickerModalProps {
  visible: boolean;
  /** Catálogo completo: se puede colocar cualquier carta, se tenga o no. */
  cards: OnePieceCard[];
  ownedIds?: Record<string, unknown>;
  /** Cuántas copias de cada carta hay ya colocadas en el binder. */
  inBinder?: Record<string, number>;
  /** Recibe la lista ya expandida: una entrada por copia a colocar. */
  onAdd: (cardIds: string[]) => void;
  onClose: () => void;
}

export function CardPickerModal({
  visible,
  cards,
  ownedIds,
  inBinder,
  onAdd,
  onClose,
}: CardPickerModalProps) {
  const { getDisplayImageUri } = useImageRegion();
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.compact;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CatalogFiltersState>(NO_FILTERS);
  const [sort, setSort] = useState<SortId>('code');
  const [showFilters, setShowFilters] = useState(false);
  /** Cantidad por carta; ausente significa no seleccionada. */
  const [picked, setPicked] = useState<Record<string, number>>({});
  /** Cuántas se pintan; crece al llegar al final de la lista. */
  const [limit, setLimit] = useState(PAGE_SIZE);

  const matches = useMemo(() => {
    const q = query.trim();
    let list = applyCatalogFilters(cards, filters);
    if (q) list = list.filter((card) => cardMatchesSearch(card, q));

    const sorted = [...list];
    // El mismo orden que el catálogo (OP→ST→PRB… y luego código), no el
    // alfabético del código: por ahí EB01 salía antes que OP01.
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name) || compareCards(a, b));
    } else if (sort === 'rarity') {
      sorted.sort(
        (a, b) =>
          RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || compareCards(a, b)
      );
    } else sorted.sort(compareCards);
    return sorted;
  }, [cards, query, filters, sort]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== 'all').length;

  const results = useMemo(() => matches.slice(0, limit), [matches, limit]);

  // Cambiar la búsqueda o los filtros devuelve la lista al principio: seguir
  // mostrando cientos de una consulta anterior no tendría sentido.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, filters, sort]);

  const showMore = () => setLimit((current) => Math.min(matches.length, current + PAGE_SIZE));

  const pickedList = useMemo(
    () =>
      Object.entries(picked)
        .map(([id, qty]) => ({ card: cards.find((c) => c.id === id), qty }))
        .filter((entry): entry is { card: OnePieceCard; qty: number } => Boolean(entry.card)),
    [picked, cards]
  );

  const totalPicked = pickedList.reduce((sum, entry) => sum + entry.qty, 0);

  const bump = (id: string, delta: number) => {
    setPicked((prev) => {
      const next = { ...prev };
      const value = (next[id] ?? 0) + delta;
      if (value <= 0) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  // La aritmetica vive en `responsiveLayout` para poder comprobarla sobre un
  // barrido de anchos con `npm run check:responsive`. El ancho se deduce y no
  // se mide: `onLayout` no vuelve a dispararse de forma fiable y el grid se
  // quedaba en dos columnas.
  const { columns, tileWidth, tileHeight } = getPickerGrid(width);

  const confirm = () => {
    // Se expande aquí: el binder solo entiende de huecos, no de cantidades.
    const ids = pickedList.flatMap((entry) => Array(entry.qty).fill(entry.card.id));
    onAdd(ids);
    setPicked({});
    setQuery('');
  };

  const close = () => {
    setPicked({});
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Añadir cartas</Text>
            <PirateButton label="Cerrar" variant="ghost" onPress={close} />
          </View>

          <View style={[styles.body, !wide && styles.bodyStacked]}>
            {wide || showFilters ? (
              <ScrollView
                style={[styles.filters, !wide && styles.filtersStacked]}
                contentContainerStyle={styles.filtersContent}
              >
                <View style={styles.filtersHead}>
                  <Text style={styles.filtersTitle}>Filtros</Text>
                  {activeFilters > 0 ? (
                    <Pressable onPress={() => setFilters(NO_FILTERS)} accessibilityRole="button">
                      <Text style={styles.clear}>Reiniciar</Text>
                    </Pressable>
                  ) : null}
                </View>

                <FilterGroup
                  label="Ordenar por"
                  options={SORT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                  value={sort}
                  onChange={(id) => setSort(id as SortId)}
                />
                <FilterGroup
                  label="Tipo"
                  options={TYPE_FILTER_OPTIONS}
                  value={filters.cardType}
                  onChange={(id) => setFilters((f) => ({ ...f, cardType: id }))}
                />
                <FilterGroup
                  label="Color"
                  options={COLOR_FILTER_OPTIONS}
                  value={filters.color}
                  onChange={(id) => setFilters((f) => ({ ...f, color: id }))}
                />
                <FilterGroup
                  label="Rareza"
                  options={RARITY_FILTER_OPTIONS}
                  value={filters.rarity}
                  onChange={(id) => setFilters((f) => ({ ...f, rarity: id }))}
                />
                <FilterGroup
                  label="Arte"
                  options={ART_FILTER_OPTIONS}
                  value={filters.art}
                  onChange={(id) => setFilters((f) => ({ ...f, art: id }))}
                />
              </ScrollView>
            ) : null}

            <View style={styles.browser}>
              {!wide ? (
                <PirateButton
                  label={
                    showFilters
                      ? 'Ocultar filtros'
                      : `Filtros${activeFilters > 0 ? ` · ${activeFilters}` : ''}`
                  }
                  variant="ghost"
                  onPress={() => setShowFilters((v) => !v)}
                />
              ) : null}
              <TextInput
                style={styles.search}
                placeholder="Buscar por nombre o código…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus={wide}
              />
              <Text style={styles.meta}>
                {matches.length.toLocaleString()} cartas
                {matches.length > results.length
                  ? ` · mostrando ${results.length.toLocaleString()}`
                  : ''}
              </Text>

              <FlatList
                key={`cols-${columns}`}
                data={results}
                keyExtractor={(item) => item.id}
                numColumns={columns}
                columnWrapperStyle={columns > 1 ? styles.row : undefined}
                contentContainerStyle={styles.grid}
                keyboardShouldPersistTaps="handled"
                onEndReached={showMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  matches.length > results.length ? (
                    <Pressable
                      onPress={showMore}
                      accessibilityRole="button"
                      accessibilityLabel="Ver más cartas"
                      style={({ pressed }) => [styles.moreButton, pressed && styles.morePressed]}
                    >
                      <Text style={styles.moreText}>
                        Ver más ({(matches.length - results.length).toLocaleString()} restantes)
                      </Text>
                    </Pressable>
                  ) : null
                }
                renderItem={({ item }) => {
                  const uri = getDisplayImageUri(item);
                  const qty = picked[item.id] ?? 0;
                  const owned = Boolean(ownedIds?.[item.id]);
                  const placed = inBinder?.[item.id] ?? 0;
                  return (
                    <View
                      style={[
                        styles.tile,
                        { width: tileWidth + PICKER_TILE_CHROME },
                        qty > 0 && styles.tileSelected,
                      ]}
                    >
                      <Pressable
                        onPress={() => bump(item.id, 1)}
                        disabled={placed > 0}
                        accessibilityRole="button"
                        accessibilityLabel={
                          placed > 0
                            ? `${item.name} ya está en el binder`
                            : `Añadir ${item.name}`
                        }
                        // Atenuada y sin respuesta: ya está colocada.
                        style={placed > 0 && qty === 0 ? styles.placedDim : undefined}
                      >
                        {uri ? (
                          <CardImage
                            uri={uri}
                            fallbackUri={item.images?.small}
                            width={tileWidth}
                            height={tileHeight}
                            priority="low"
                            recyclingKey={item.id}
                          />
                        ) : (
                          <View
                            style={[
                              styles.placeholder,
                              { width: tileWidth, height: tileHeight },
                            ]}
                          >
                            <Text style={styles.placeholderText}>🃏</Text>
                          </View>
                        )}
                        {qty > 0 ? (
                          <View style={styles.qtyBadge}>
                            <Text style={styles.qtyBadgeText}>{qty}</Text>
                          </View>
                        ) : null}
                        {/* Marca de propiedad, aparte de si está colocada. */}
                        {owned ? (
                          <View style={styles.ownedDot}>
                            <Text style={styles.ownedDotText}>✓</Text>
                          </View>
                        ) : null}
                        {placed > 0 ? (
                          <View style={styles.placedTag}>
                            <Text style={styles.placedTagText}>
                              {placed > 1 ? `En el binder ×${placed}` : 'En el binder'}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>

                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {item.code}
                        {item.set?.name ? ` · ${formatSetDisplayName(item.set.name)}` : ''}
                      </Text>

                      {qty > 0 ? (
                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => bump(item.id, -1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar una de ${item.name}`}
                            style={styles.stepBtn}
                          >
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.stepValue}>{qty}</Text>
                          <Pressable
                            onPress={() => bump(item.id, 1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Añadir otra de ${item.name}`}
                            style={styles.stepBtn}
                          >
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      ) : placed > 0 ? (
                        /*
                          Ya colocada: nada que añadir. Va un rótulo del mismo
                          alto que el botón y no un hueco, porque si no las
                          fichas de la fila quedan a distinta altura.
                        */
                        <View style={styles.placedNote}>
                          <Text style={styles.placedNoteText} numberOfLines={1}>
                            {placed > 1 ? `En el binder ×${placed}` : 'En el binder'}
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => bump(item.id, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Añadir ${item.name}`}
                          style={styles.addBtn}
                        >
                          <Text style={styles.addBtnText}>+ Añadir</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.empty}>Ninguna carta coincide con la búsqueda.</Text>
                }
              />
            </View>

            <View style={[styles.selected, !wide && styles.selectedStacked]}>
              <View style={styles.selectedHead}>
                <Text style={styles.selectedTitle}>Seleccionadas ({totalPicked})</Text>
                {totalPicked > 0 ? (
                  <Pressable onPress={() => setPicked({})} accessibilityRole="button">
                    <Text style={styles.clear}>Limpiar</Text>
                  </Pressable>
                ) : null}
              </View>

              {totalPicked === 0 ? (
                <Text style={styles.selectedEmpty}>
                  Las cartas que elijas aparecerán aquí.
                </Text>
              ) : (
                <ScrollView style={styles.selectedList}>
                  {pickedList.map(({ card, qty }) => {
                    const uri = getDisplayImageUri(card);
                    return (
                      <View key={card.id} style={styles.selectedRow}>
                        {uri ? (
                          <CardImage
                            uri={uri}
                            fallbackUri={card.images?.small}
                            width={30}
                            height={42}
                            priority="low"
                            recyclingKey={`sel-${card.id}`}
                          />
                        ) : null}
                        <View style={styles.selectedInfo}>
                          <Text style={styles.selectedName} numberOfLines={1}>
                            {card.name}
                          </Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            {card.code}
                          </Text>
                        </View>
                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => bump(card.id, -1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar una de ${card.name}`}
                            style={styles.stepBtn}
                          >
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.stepValue}>{qty}</Text>
                          <Pressable
                            onPress={() => bump(card.id, 1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Añadir otra de ${card.name}`}
                            style={styles.stepBtn}
                          >
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <PirateButton
              label={
                totalPicked === 0
                  ? 'Elige alguna carta'
                  : `Añadir ${totalPicked} carta${totalPicked === 1 ? '' : 's'}`
              }
              variant="primary"
              size="lg"
              disabled={totalPicked === 0}
              onPress={confirm}
              style={styles.confirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Grupo de chips. Mismo patrón que los filtros del catálogo. */
function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupChips}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.groupChip, active && styles.groupChipActive]}
            >
              <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    height: '92%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.text },
  body: { flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 0 },
  bodyStacked: { flexDirection: 'column' },
  browser: { flex: 1, minWidth: 0, gap: spacing.sm },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: FILTERS_WIDTH,
    width: FILTERS_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtersStacked: { width: '100%', flexBasis: 'auto', maxHeight: 190 },
  filtersContent: { padding: spacing.sm, gap: spacing.md },
  filtersHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filtersTitle: { ...typography.heading, color: colors.text },
  group: { gap: 4 },
  groupLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  groupChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { ...typography.caption, color: colors.text },
  groupChipTextActive: { color: colors.textOnPrimary },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 15,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  grid: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: { gap: spacing.sm, justifyContent: 'flex-start' },
  tile: {
    borderRadius: radii.md,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  placeholder: {
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 24, opacity: 0.5 },
  qtyBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '900' },
  moreButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
  },
  morePressed: { opacity: 0.7 },
  moreText: { ...typography.label, color: colors.text },
  /** Ya colocada: se apaga para distinguirla de un vistazo. */
  placedDim: { opacity: 0.42 },
  placedTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    backgroundColor: 'rgba(13, 63, 97, 0.82)',
  },
  placedTagText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  ownedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedDotText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  cardName: {
    ...typography.caption,
    color: colors.text,
    marginTop: 4,
    height: LINE_HEIGHT,
    lineHeight: LINE_HEIGHT,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textMuted,
    height: LINE_HEIGHT,
    lineHeight: LINE_HEIGHT,
  },
  addBtn: {
    marginTop: 4,
    height: ACTION_HEIGHT,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '800' },
  placedNote: {
    marginTop: 4,
    height: ACTION_HEIGHT,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  placedNoteText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  stepper: {
    marginTop: 4,
    height: ACTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  stepBtn: {
    paddingHorizontal: 10,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  stepValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  selected: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: SELECTED_WIDTH,
    width: SELECTED_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  selectedStacked: { width: '100%', flexBasis: 'auto', maxHeight: 180 },
  selectedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedTitle: { ...typography.heading, color: colors.text },
  clear: { ...typography.caption, color: colors.primary, fontWeight: '800' },
  selectedEmpty: { ...typography.caption, color: colors.textMuted },
  selectedList: { flex: 1 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  selectedInfo: { flex: 1, minWidth: 0 },
  selectedName: { ...typography.caption, color: colors.text, fontWeight: '800' },
  footer: { paddingTop: spacing.xs },
  confirm: { alignSelf: 'stretch' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
});
