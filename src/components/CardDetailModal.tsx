import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OnePieceCard } from '../types/card';
import { useImageRegion } from '../context/ImageRegionContext';
import { formatSetDisplayName } from '../utils/cards';
import {
  fetchOptcgPrices,
  formatUsd,
  isParallelVariant,
  priceRowsForCatalogCard,
  tcgplayerSearchUrl,
  type OptcgPriceRow,
} from '../utils/optcgPrices';
import {
  formatCardMetaLine,
  stripCardHtml,
} from '../utils/cardDisplay';
import { CardImage } from './CardImage';
import {
  CollectionRewardOverlay,
  type CollectionRewardEvent,
} from './CollectionRewardOverlay';
import { loadFavoriteIds, toggleFavorite } from '../storage/favorites';
import { DETAIL_IMAGE, prefetchImageUris } from '../utils/imageLoading';
import {
  SLOT_INK,
  wantedCardImageSize,
  wantedPanelSize,
  wantedSlotStyle,
  wantedStackedCardSize,
  wantedStackedStyle,
  WANTED_SLOTS,
} from '../utils/wantedModalSlots';

const MODAL_BODY_BG = require('../../img/background.png');

/**
 * DISEÑO CONGELADO — el póster WANTED queda fuera del design system.
 * Estos valores están fijados a propósito para que un cambio de tema no lo
 * altere. No sustituir por tokens de `constants/theme`.
 */
const wanted = {
  gold: '#ffd54f',
  red: '#c41e3a',
  error: '#ef4444',
  gapSm: 8,
  gapMd: 16,
} as const;

function stripPrefix(value: string | number | undefined, prefix: string): string {
  if (value === undefined || value === null || value === '') return '—';
  const s = String(value).trim();
  if (s.startsWith(prefix)) return s.slice(prefix.length).trim() || '—';
  return s;
}

interface CardDetailModalProps {
  card: OnePieceCard | null;
  visible: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  inCollection?: boolean;
  quantity?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  prefetchUris?: string[];
}

/** En estrecho las zonas fluyen en vez de posicionarse en absoluto. */
const StackedContext = createContext(false);

function SlotWrap({
  slotKey,
  children,
  style,
}: {
  slotKey: keyof typeof WANTED_SLOTS;
  children: ReactNode;
  style?: object;
}) {
  const stacked = useContext(StackedContext);
  return (
    <View
      style={[
        stacked ? wantedStackedStyle(slotKey) : wantedSlotStyle(WANTED_SLOTS[slotKey]),
        style,
      ]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

export function CardDetailModal({
  card,
  visible,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  inCollection,
  quantity = 0,
  onAdd,
  onRemove,
  onIncrement,
  onDecrement,
  prefetchUris = [],
}: CardDetailModalProps) {
  const { getDisplayImageUri } = useImageRegion();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const wide = windowWidth >= 720;

  const sheetMaxHeight = windowHeight - insets.top - 8;
  const panel = wantedPanelSize(windowWidth, sheetMaxHeight, wide);
  const closeSlot = WANTED_SLOTS.close;
  const cardSize = wide
    ? wantedCardImageSize(panel.width, panel.height)
    : wantedStackedCardSize(panel.width);
  const cardImgW = cardSize.width;
  const cardImgH = cardSize.height;
  const closeFontSize = Math.round(panel.width * (closeSlot.width / 100) * 0.72);

  const imageUri = card ? getDisplayImageUri(card, 'large') : undefined;

  const addBtnRef = useRef<View>(null);
  const qtyPlusRef = useRef<View>(null);
  const addBtnScale = useRef(new Animated.Value(1)).current;
  const cardFlash = useRef(new Animated.Value(0)).current;
  const [reward, setReward] = useState<CollectionRewardEvent | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [priceStatus, setPriceStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [priceRows, setPriceRows] = useState<OptcgPriceRow[]>([]);

  useEffect(() => {
    if (!visible) return;
    void loadFavoriteIds().then(setFavoriteIds);
  }, [visible]);

  useEffect(() => {
    if (!visible || !prefetchUris.length) return;
    void prefetchImageUris(prefetchUris, DETAIL_IMAGE.width, DETAIL_IMAGE.height);
  }, [visible, prefetchUris]);

  useEffect(() => {
    if (!visible) setReward(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !card) return;
    let cancelled = false;
    setPriceStatus('loading');
    setPriceRows([]);
    void fetchOptcgPrices(card.code)
      .then((data) => {
        if (cancelled) return;
        const filtered = priceRowsForCatalogCard(data, card.id);
        if (!filtered.length) {
          setPriceStatus('empty');
          return;
        }
        setPriceRows(filtered);
        setPriceStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setPriceStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, card?.id, card?.code]);

  const isFavorite = card ? favoriteIds.has(card.id) : false;

  const handleToggleFavorite = useCallback(async () => {
    if (!card) return;
    const now = await toggleFavorite(card.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (now) next.add(card.id);
      else next.delete(card.id);
      return next;
    });
  }, [card]);

  const playAddFeedback = (
    message = '☠ ¡Recompensa aumentada! Carta asegurada.',
    originRef = addBtnRef
  ) => {
    originRef.current?.measureInWindow((x, y, width, height) => {
      setReward({
        message,
        origin: { x: x + width / 2, y: y + height / 2 },
      });
    });
    Animated.parallel([
      Animated.sequence([
        Animated.timing(addBtnScale, { toValue: 0.92, duration: 90, useNativeDriver: true }),
        Animated.spring(addBtnScale, {
          toValue: 1,
          friction: 4,
          tension: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(cardFlash, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(cardFlash, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleAddPress = () => {
    if (!onAdd) return;
    playAddFeedback();
    onAdd();
  };

  const handleIncrementPress = () => {
    if (!onIncrement) return;
    playAddFeedback('+1 copia asegurada!', qtyPlusRef);
    onIncrement();
  };

  if (!card) return null;

  const flashOpacity = cardFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const isLeader = card.type === 'LEADER';
  const lifeOrCost = isLeader
    ? stripPrefix(card.cost, 'Life')
    : stripPrefix(card.cost, 'Cost');
  const power = stripPrefix(card.power, 'Power');
  const colorName = card.color
    ? card.color
        .split('/')
        .map((c) => c.trim())
        .filter(Boolean)
        .join(' / ')
    : '—';

  const collectionActions = inCollection ? (
    <View style={styles.qtyBlock}>
      <View style={styles.qtyRow}>
        <Pressable style={styles.qtyBtn} onPress={onDecrement}>
          <Text style={styles.qtyBtnText}>−</Text>
        </Pressable>
        <Text style={styles.qtyValue}>×{quantity}</Text>
        <View ref={qtyPlusRef} collapsable={false}>
          <Pressable style={styles.qtyBtn} onPress={handleIncrementPress}>
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
      {onRemove ? (
        <Pressable style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeBtnText}>Quitar</Text>
        </Pressable>
      ) : null}
    </View>
  ) : (
    onAdd && (
      <Animated.View
        ref={addBtnRef}
        collapsable={false}
        style={{ flex: 1, transform: [{ scale: addBtnScale }] }}
      >
        <Pressable style={styles.addBtn} onPress={handleAddPress}>
          <Text style={styles.addBtnText} numberOfLines={1}>
            ☠  Añadir a mi colección
          </Text>
        </Pressable>
      </Animated.View>
    )
  );

  const posterContent = (
    <>
            {wide ? (
              <Pressable
                style={[wantedSlotStyle(WANTED_SLOTS.close), styles.closeHit]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Text
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                  style={[
                    styles.closeText,
                    { fontSize: closeFontSize, lineHeight: closeFontSize },
                  ]}
                >
                  ✕
                </Text>
              </Pressable>
            ) : null}

            <SlotWrap slotKey="headerMeta" style={styles.headerMetaSlot}>
              <Text style={[styles.meta, !wide && styles.metaStacked]} numberOfLines={1}>
                {formatCardMetaLine(card)}
              </Text>
            </SlotWrap>

            <SlotWrap slotKey="headerName" style={styles.headerNameSlot}>
              <Text style={[styles.cardName, !wide && styles.cardNameStacked]} numberOfLines={2}>
                {card.name}
              </Text>
            </SlotWrap>

            <SlotWrap slotKey="card" style={styles.cardSlot}>
              <View style={[styles.cardImageInner, { width: cardImgW, height: cardImgH }]}>
                {imageUri ? (
                  <CardImage
                    key={card.id}
                    uri={imageUri}
                    fallbackUri={card.images?.large || card.images?.small}
                    width={cardImgW}
                    height={cardImgH}
                    contentFit="contain"
                    priority="high"
                    recyclingKey={card.id}
                  />
                ) : (
                  <View style={[styles.cardPlaceholder, { width: cardImgW, height: cardImgH }]}>
                    <Text style={styles.placeholderEmoji}>🃏</Text>
                  </View>
                )}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.cardFlash,
                    {
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: cardImgW,
                      height: cardImgH,
                      opacity: flashOpacity,
                    },
                  ]}
                />
              </View>
            </SlotWrap>

            {/*
              Antes iban con `wantedSlotStyle` directo, así que al apilar
              seguían en posición absoluta sobre un contenedor que fluye: se
              quedaban flotando encima del texto y con 5%x10% de área táctil.
              Pasando por SlotWrap, en ancho salen igual y al apilar se
              convierten en dos botones de media fila bajo la carta.
            */}
            <SlotWrap slotKey="navPrev">
              <Pressable
                style={[styles.navHit, !wide && styles.navHitStacked]}
                onPress={onPrevious}
                disabled={!hasPrevious}
                accessibilityRole="button"
                accessibilityLabel="Carta anterior"
              >
                <Text style={[styles.navText, !hasPrevious && styles.navDisabled]}>‹</Text>
              </Pressable>
            </SlotWrap>

            <SlotWrap slotKey="navNext">
              <Pressable
                style={[styles.navHit, !wide && styles.navHitStacked]}
                onPress={onNext}
                disabled={!hasNext}
                accessibilityRole="button"
                accessibilityLabel="Carta siguiente"
              >
                <Text style={[styles.navText, !hasNext && styles.navDisabled]}>›</Text>
              </Pressable>
            </SlotWrap>

            <SlotWrap slotKey="statLife" style={styles.statSlot}>
              <Text style={[styles.statValue, styles.statValueLife]} numberOfLines={1}>
                {lifeOrCost}
              </Text>
            </SlotWrap>
            <SlotWrap slotKey="statPower" style={styles.statSlot}>
              <Text
                style={[styles.statValue, styles.statValueLife, styles.statValuePower]}
                numberOfLines={1}
              >
                {power}
              </Text>
            </SlotWrap>
            <SlotWrap slotKey="statColor" style={[styles.statSlot, styles.statSlotColor]}>
              <Text style={[styles.statValue, styles.statValueColor]} numberOfLines={2}>
                {colorName}
              </Text>
            </SlotWrap>

            <SlotWrap slotKey="price" style={[styles.priceSlot, !wide && styles.slotFlow]}>
              {!wide ? <Text style={styles.stackLabel}>Precio</Text> : null}
              {priceStatus === 'loading' ? (
                <Text style={styles.priceMuted}>Cargando…</Text>
              ) : null}
              {priceStatus === 'error' ? (
                <Text style={styles.priceMuted}>Precio no disponible</Text>
              ) : null}
              {priceStatus === 'ok' ? (
                <View style={styles.pricePanel}>
                  <View style={styles.pricePanelLeft}>
                    {priceRows.map((row) => (
                      <View
                        key={row.card_image_id || row.card_name}
                        style={styles.priceVariant}
                      >
                        <Text style={styles.priceLabel}>
                          {isParallelVariant(row) ? 'Parallel' : 'Normal'}
                        </Text>
                        <Text style={styles.priceMarket}>
                          {formatUsd(row.market_price)}
                        </Text>
                        <Text style={styles.priceMuted}>
                          Inventario {formatUsd(row.inventory_price)}
                          {row.date_scraped ? ` · ${row.date_scraped}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() =>
                      Linking.openURL(tcgplayerSearchUrl(card.id || card.code))
                    }
                    style={styles.priceBtn}
                  >
                    <Text style={styles.priceBtnText}>Ver en TCGplayer ↗</Text>
                  </Pressable>
                </View>
              ) : null}
            </SlotWrap>

            <SlotWrap slotKey="type" style={[styles.typeTextSlot, !wide && styles.slotFlow]}>
              {!wide ? <Text style={styles.stackLabel}>Tipo</Text> : null}
              <Text style={styles.slotBody} numberOfLines={wide ? 3 : undefined}>
                {card.family || '—'}
              </Text>
            </SlotWrap>

            <SlotWrap slotKey="effect" style={[styles.effectTextSlot, !wide && styles.slotFlow]}>
              {!wide ? <Text style={styles.stackLabel}>Efecto</Text> : null}
              {/*
                El scroll anidado solo vale en ancho, donde la zona tiene alto
                fijo. Apilado no lo tiene, así que el ScrollView se quedaba en
                nada y cortaba el efecto a media frase; aquí ya scrollea el
                panel entero.
              */}
              {wide ? (
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  <Text style={styles.slotBody}>
                    {card.ability ? stripCardHtml(card.ability) : '—'}
                  </Text>
                </ScrollView>
              ) : (
                <Text style={styles.slotBody}>
                  {card.ability ? stripCardHtml(card.ability) : '—'}
                </Text>
              )}
            </SlotWrap>

            <SlotWrap slotKey="actions" style={styles.actionsSlot}>
              <View style={styles.actionRow}>
                {collectionActions}
                <Pressable
                  style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                  onPress={() => void handleToggleFavorite()}
                  accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Favoritos'}
                >
                  <Text style={[styles.favIcon, isFavorite && styles.favIconActive]}>
                    {isFavorite ? '♥' : '♡'}
                  </Text>
                </Pressable>
              </View>
            </SlotWrap>

            <SlotWrap slotKey="verified" style={styles.centerSlot}>
              <Text style={styles.verified}>🔒 Producto oficial verificado</Text>
            </SlotWrap>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          wide ? styles.overlayWide : styles.overlayMobile,
          { paddingTop: wide ? insets.top : 0, paddingBottom: wide ? insets.bottom : 0 },
        ]}
      >
        <CollectionRewardOverlay event={reward} onClear={() => setReward(null)} />
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />

        <View style={[styles.panelShell, { width: panel.width, height: panel.height }]}>
          <StackedContext.Provider value={!wide}>
            {wide ? (
              <ImageBackground
                source={MODAL_BODY_BG}
                style={styles.canvas}
                imageStyle={styles.canvasImage}
                resizeMode="stretch"
              >
                {posterContent}
              </ImageBackground>
            ) : (
              <ScrollView
                style={styles.stackScroll}
                contentContainerStyle={styles.stackContent}
                showsVerticalScrollIndicator
              >
                {posterContent}
              </ScrollView>
            )}
            {!wide ? (
              <Pressable
                style={styles.closeStacked}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={12}
              >
                <Text style={[styles.closeText, styles.closeTextStacked]}>✕</Text>
              </Pressable>
            ) : null}
          </StackedContext.Provider>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /**
   * Apilado el cierre no puede heredar el slot: su tamano sale de un 2.47 % del
   * ancho del panel, que en movil son 6 px, y su color claro se pierde sobre el
   * papel. Aqui es un boton propio con area tactil suficiente.
   */
  closeStacked: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92, 61, 33, 0.12)',
    zIndex: 10,
  },
  closeTextStacked: {
    color: SLOT_INK.text,
    fontSize: 20,
    lineHeight: 24,
  },
  /** Sobre pergamino el texto claro del poster no se lee: pasa a tinta. */
  /** Deja libre la esquina de la X, que apilada flota sobre el papel. */
  metaStacked: { color: SLOT_INK.label, paddingRight: 44 },
  cardNameStacked: {
    color: SLOT_INK.text,
    fontSize: 24,
    textShadowColor: 'transparent',
    paddingRight: 44,
  },
  /** Version apilada: papel liso en vez del poster estirado a lo alto. */
  stackScroll: {
    flex: 1,
    backgroundColor: '#f2e4c6',
    borderRadius: 12,
  },
  stackContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: wanted.gapMd,
  },
  overlay: { flex: 1 },
  overlayWide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wanted.gapSm,
  },
  overlayMobile: { justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 8, 6, 0.82)' },
  panelShell: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(232, 185, 35, 0.4)',
    zIndex: 1,
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.55)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 16,
      },
    }),
  },
  canvas: { flex: 1, width: '100%', height: '100%' },
  canvasImage: { borderRadius: 10 },
  closeHit: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    color: '#f5efe6',
    fontWeight: '700',
    textAlign: 'center',
  },
  centerSlot: { alignItems: 'center', justifyContent: 'center' },
  headerMetaSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: '1%',
    zIndex: 2,
  },
  meta: {
    color: '#f5efe6',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'left',
    width: '100%',
  },
  headerNameSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: '1%',
    zIndex: 2,
  },
  cardName: {
    color: '#f5efe6',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'left',
    width: '100%',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    ...Platform.select({
      web: {
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      default: {},
    }),
  },
  navHit: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  /** Apilado: área táctil de verdad y aspecto de botón sobre el papel liso. */
  navHitStacked: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(44, 24, 16, 0.25)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  navText: { fontSize: 26, color: '#2c1810', fontWeight: '300' },
  navDisabled: { opacity: 0.35 },
  cardSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageInner: {
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  cardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  placeholderEmoji: { fontSize: 36, opacity: 0.4 },
  cardFlash: { backgroundColor: wanted.gold },
  statSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 10,
    paddingHorizontal: 0,
    zIndex: 5,
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: SLOT_INK.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  statValueLife: {
    width: '100%',
    transform: [{ translateY: -3 }],
  },
  statValuePower: {
    letterSpacing: -0.5,
    transform: [{ translateX: -10 }, { translateY: -3 }],
  },
  statSlotColor: {
    paddingTop: 19,
    paddingBottom: 12,
    paddingHorizontal: '3%',
  },
  statValueColor: {
    width: '100%',
    textAlign: 'center',
    transform: [{ translateX: -8 }, { translateY: -5 }],
  },
  priceSlot: {
    justifyContent: 'flex-start',
    paddingHorizontal: '8%',
    paddingTop: 26,
    paddingBottom: 4,
    zIndex: 5,
    overflow: 'hidden',
  },
  pricePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  pricePanelLeft: {
    flex: 1,
    minWidth: 0,
  },
  priceVariant: {
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 11,
    color: SLOT_INK.muted,
    fontWeight: '600',
    textAlign: 'left',
  },
  priceMarket: {
    fontSize: 20,
    fontWeight: '800',
    color: SLOT_INK.price,
    textAlign: 'left',
    marginTop: 2,
    marginBottom: 2,
  },
  priceMuted: {
    fontSize: 10,
    color: SLOT_INK.muted,
    textAlign: 'left',
  },
  priceBtn: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#8b6914',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(245, 235, 210, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  priceBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4a3510',
    textAlign: 'center',
    lineHeight: 12,
  },
  typeTextSlot: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: '8%',
    paddingTop: 30,
    paddingBottom: 2,
    zIndex: 5,
    overflow: 'hidden',
  },
  effectTextSlot: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: '8%',
    paddingTop: 38,
    paddingBottom: 4,
    zIndex: 5,
    overflow: 'hidden',
  },
  slotBody: {
    fontSize: 12,
    lineHeight: 17,
    color: SLOT_INK.text,
    fontWeight: '500',
    textAlign: 'left',
    width: '100%',
  },
  actionsSlot: { justifyContent: 'center', paddingHorizontal: '2%' },
  /**
   * Apilado se anulan los márgenes del póster: los 26/30/38 px de `paddingTop`
   * de precio, tipo y efecto están ahí para dejar sitio a los rótulos pintados
   * en `img/background.png`, que en estrecho no se dibuja. Sin esto quedaban
   * franjas vacías entre secciones.
   */
  slotFlow: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    overflow: 'visible',
  },
  /** Los rótulos del póster van impresos; apilado hay que escribirlos. */
  stackLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: SLOT_INK.label,
    marginBottom: 4,
  },
  actionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  addBtn: {
    flex: 1,
    backgroundColor: wanted.red,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6b1020',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  favBtn: {
    width: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(92, 64, 35, 0.45)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    borderColor: wanted.red,
    backgroundColor: 'rgba(196, 30, 58, 0.12)',
  },
  favIcon: { fontSize: 22, color: SLOT_INK.muted },
  favIconActive: { color: wanted.red },
  qtyBlock: { flex: 1, gap: 6 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wanted.gapMd,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    paddingVertical: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: SLOT_INK.text },
  qtyValue: { fontSize: 16, fontWeight: '800', color: SLOT_INK.text },
  removeBtn: {
    borderWidth: 1,
    borderColor: wanted.error,
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeBtnText: { color: wanted.error, fontWeight: '700', fontSize: 11 },
  verified: {
    fontSize: 9,
    color: SLOT_INK.muted,
    textAlign: 'center',
  },
});
