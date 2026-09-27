import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';
import { useImageRegion } from '../../context/ImageRegionContext';
import {
  getRarityBadgeColors,
  getRarityBadgeLabel,
  getRarityGlowColor,
} from '../../utils/rarity';
import { getArtAspect, getArtCrop, getBoosterImageUri } from '../../utils/boosterImages';
import { BoosterArt } from './BoosterArt';
import type { PulledCard } from '../../utils/packs';
import { CardImage } from '../CardImage';

const CARD_ASPECT = 5 / 7;
const REVEAL_IN_MS = 320;
const REVEAL_OUT_MS = 260;

/** Rarezas de relleno: van juntas en una tanda, no de una en una. */
const BULK_RARITIES = new Set(['C', 'UC']);

/** Duración de una pasada del destello. */
const SHINE_MS = 1500;

/**
 * Cartas que merecen destello al salir: R, SR -incluida SR★-, cualquier arte
 * alternativo y las de ilustración de manga, que el catálogo etiqueta `Comic`.
 * Las rarezas por encima (L, SEC, SP, TR) ya llegan como alternativa o como
 * chase, asi que tambien entran por su propio camino.
 */
function isShinyPull(pulled: PulledCard): boolean {
  const rarity = pulled.card.rarity ?? '';
  if (rarity === 'R' || rarity.startsWith('SR')) return true;
  if (pulled.isAltArt) return true;
  return pulled.card.illustrationType === 'Comic';
}
/**
 * A partir de aquí se ofrece el atajo para saltarse el relleno. Con un sobre
 * suelto son nueve y pasarlas una a una es parte de la gracia; con cinco
 * sobres son más de cuarenta y conviene poder ir al grano.
 */
const BULK_THRESHOLD = 12;

type Phase = 'sealed' | 'revealing' | 'summary';

interface PackOpeningOverlayProps {
  cards: PulledCard[];
  packId: string;
  packLabel: string;
  packName: string;
  onCommit: () => void;
  onDismiss: () => void;
}

export function PackOpeningOverlay({
  cards,
  packId,
  packLabel,
  packName,
  onCommit,
  onDismiss,
}: PackOpeningOverlayProps) {
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('sealed');
  const [index, setIndex] = useState(0);

  const cardHeight = Math.min(height * 0.62, 460);
  const cardWidth = Math.min(cardHeight * CARD_ASPECT, width * 0.78);
  const boosterUri = getBoosterImageUri(packId);
  // Con arte real el marco toma la proporción del sobre; sin él, la de una carta.
  const wrapperHeight = cardHeight;
  const wrapperWidth = boosterUri ? cardHeight * getArtAspect(packId) : cardWidth;

  /**
   * Se separa el relleno de las buenas conservando el orden de tirada: primero
   * se ve el montón entero y luego se revelan las raras de una en una, que es
   * donde está la emoción.
   */
  const { bulk, hits, split } = useMemo(() => {
    // Una alternativa nunca es relleno aunque su rareza sea C o UC: 836 del
    // catálogo lo son, y son justo el premio del sobre.
    const esRelleno = (pulled: PulledCard) =>
      BULK_RARITIES.has(pulled.card.rarity) && !pulled.isAltArt;
    const comunes = cards.filter(esRelleno);
    const buenas = cards.filter((pulled) => !esRelleno(pulled));
    return { bulk: comunes, hits: buenas, split: comunes.length >= BULK_THRESHOLD };
  }, [cards]);

  /**
   * Todas se revelan una a una; lo que cambia es el orden: primero el relleno
   * y al final las buenas, para que la tirada termine hacia arriba.
   */
  const revealList = split ? [...bulk, ...hits] : cards;

  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  // Se consulta dentro de callbacks de animación, donde el estado sería obsoleto.
  const anim = useRef<'idle' | 'in' | 'out'>('idle');

  useEffect(() => {
    if (phase !== 'sealed') return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [phase, sweep]);

  const playEnter = useCallback(() => {
    enter.setValue(0);
    exit.setValue(0);
    anim.current = 'in';
    Animated.timing(enter, {
      toValue: 1,
      duration: REVEAL_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (anim.current === 'in') anim.current = 'idle';
    });
  }, [enter, exit]);

  const openPack = useCallback(() => {
    setPhase('revealing');
    playEnter();
  }, [playEnter]);

  /** Atajo: deja el relleno atrás y sigue por la primera de las buenas. */
  const skipToHits = useCallback(() => {
    anim.current = 'idle';
    setIndex(bulk.length);
    playEnter();
  }, [bulk.length, playEnter]);

  const advance = useCallback(() => {
    // Tocar mientras la carta entra la asienta de golpe en vez de ignorar el toque.
    if (anim.current === 'in') {
      // stopAnimation no llama a su callback en react-native-web: asienta a mano.
      enter.stopAnimation();
      enter.setValue(1);
      anim.current = 'idle';
      return;
    }
    if (anim.current === 'out') return;

    if (index >= revealList.length - 1) {
      setPhase('summary');
      return;
    }

    anim.current = 'out';
    Animated.timing(exit, {
      toValue: 1,
      duration: REVEAL_OUT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setIndex((prev) => prev + 1);
      playEnter();
    });
  }, [revealList.length, enter, exit, index, playEnter]);

  const current = revealList[index];
  const shiny = phase === 'revealing' && current ? isShinyPull(current) : false;

  /**
   * El destello va en su propio bucle y no en la animación de entrada: esta
   * se reinicia con cada carta y el brillo tiene que seguir corriendo
   * mientras la carta esté en pantalla.
   */
  useEffect(() => {
    if (!shiny) return;
    shine.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shine, {
        toValue: 1,
        duration: SHINE_MS,
        easing: Easing.inOut(Easing.quad),
        // En web el driver nativo no está disponible, como en el resto del archivo.
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shiny, index, shine]);

  const remaining = revealList.length - index - 1;
  const newCount = cards.filter((pulled) => pulled.isNew).length;
  const dupeCount = cards.length - newCount;

  const revealStyle = useMemo(() => {
    const translateY = Animated.add(
      enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
      exit.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.8] })
    );
    const scale = Animated.multiply(
      enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
      exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] })
    );
    return {
      opacity: Animated.multiply(enter, exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
      transform: [{ translateY }, { scale }],
    };
  }, [enter, exit, height]);

  if (phase === 'sealed') {
    return (
      <View style={styles.backdrop}>
        <Text style={styles.sealedHint}>Toca para abrir</Text>
        <Pressable
          onPress={openPack}
          accessibilityRole="button"
          accessibilityLabel={`Abrir sobre ${packLabel}`}
          style={[
            boosterUri ? styles.wrapperBare : styles.wrapper,
            { width: wrapperWidth, height: wrapperHeight },
          ]}
        >
          {boosterUri ? (
            <BoosterArt uri={boosterUri} height={wrapperHeight} crop={getArtCrop(packId)} />
          ) : (
            <View style={styles.wrapperInner}>
              <Text style={styles.wrapperSet}>{packLabel}</Text>
              <Text style={styles.wrapperName} numberOfLines={3}>
                {packName}
              </Text>
              <Text style={styles.wrapperFoot}>12-CARD BOOSTER PACK</Text>
            </View>
          )}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cutGuide,
              {
                transform: [
                  {
                    translateY: sweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-cardHeight * 0.15, cardHeight * 1.1],
                    }),
                  },
                ],
              },
            ]}
          />
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.skipBtn} accessibilityRole="button">
          <Text style={styles.skipLabel}>Saltar</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'revealing' && current) {
    const glow = getRarityGlowColor(current.card.rarity);
    // El atajo solo tiene sentido mientras quede relleno por delante.
    const enRelleno = split && hits.length > 0 && index < bulk.length;
    return (
      <View style={styles.backdrop}>
        <Text style={styles.counter}>
          {index + 1} / {revealList.length}
        </Text>
        <Pressable
          onPress={advance}
          accessibilityRole="button"
          accessibilityLabel={`${current.card.name}. Toca para continuar`}
          style={[styles.revealArea, { width: cardWidth, height: cardHeight }]}
        >
          {remaining > 1 ? (
            <View style={[styles.stackGhost, styles.stackGhostSecond]} />
          ) : null}
          {remaining > 0 ? <View style={styles.stackGhost} /> : null}
          <Animated.View style={[styles.revealCard, revealStyle]}>
            {/* Halo que respira detrás de la carta. Va aparte del box-shadow
                fijo de la rareza porque ese no se puede animar. */}
            {shiny ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.halo,
                  {
                    width: cardWidth,
                    height: cardHeight,
                    backgroundColor: glow ?? colors.goldBright,
                    opacity: shine.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.22, 0.55, 0.22],
                    }),
                    transform: [
                      {
                        scale: shine.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1.02, 1.09, 1.02],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ) : null}

            <View>
              <PulledCardFace pulled={current} width={cardWidth} height={cardHeight} glow={glow} />
              {/* El recorte va encima de la carta y no envolviéndola: como
                  hermano, no corta la sombra de rareza de la ficha. */}
              {shiny ? (
                <View
                  pointerEvents="none"
                  style={[styles.shineClip, { width: cardWidth, height: cardHeight }]}
                >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shineBar,
                    {
                      height: cardHeight * 2,
                      opacity: shine.interpolate({
                        inputRange: [0, 0.15, 0.5, 0.85, 1],
                        outputRange: [0, 0.75, 0.9, 0.75, 0],
                      }),
                      transform: [
                        { rotate: '22deg' },
                        {
                          translateX: shine.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-cardWidth * 0.9, cardWidth * 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                </View>
              ) : null}
            </View>
          </Animated.View>
        </Pressable>
        <View style={styles.revealActions}>
          {enRelleno ? (
            <Pressable
              onPress={skipToHits}
              style={[styles.actionBtn, styles.jumpBtn]}
              accessibilityRole="button"
              accessibilityLabel={`Saltar las comunes y ver las ${hits.length} buenas`}
            >
              <Text style={[styles.actionLabel, styles.jumpLabel]}>
                Saltar a las {hits.length} buenas
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setPhase('summary')}
            style={
              enRelleno ? [styles.actionBtn, styles.skipBtnPaired] : styles.skipBtn
            }
            accessibilityRole="button"
          >
            <Text style={enRelleno ? [styles.actionLabel, styles.skipLabelPaired] : styles.skipLabel}>
              Saltar todo
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.summaryPanel}>
        <Text style={styles.summaryTitle}>Cartas obtenidas</Text>
        <Text style={styles.summaryCounts}>
          {newCount > 0 ? `${newCount} nueva${newCount === 1 ? '' : 's'}` : 'Ninguna nueva'}
          {dupeCount > 0 ? ` · ${dupeCount} repetida${dupeCount === 1 ? '' : 's'}` : ''}
        </Text>
        <ScrollView contentContainerStyle={styles.summaryGrid} showsVerticalScrollIndicator={false}>
          {cards.map((pulled, i) => (
            <View
              key={`${pulled.card.id}-${i}`}
              style={[styles.summaryItem, !pulled.isNew && styles.summaryItemDupe]}
            >
              <PulledCardFace
                pulled={pulled}
                width={96}
                height={134}
                glow={getRarityGlowColor(pulled.card.rarity)}
                compact
              />
            </View>
          ))}
        </ScrollView>
        <Pressable onPress={onCommit} style={styles.commitBtn} accessibilityRole="button">
          <Text style={styles.commitLabel}>Añadir a la colección</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface PulledCardFaceProps {
  pulled: PulledCard;
  width: number;
  height: number;
  glow: string | null;
  compact?: boolean;
}

function PulledCardFace({ pulled, width, height, glow, compact }: PulledCardFaceProps) {
  const { getDisplayImageUri } = useImageRegion();
  const imageUri = getDisplayImageUri(pulled.card);
  const rarityLabel = getRarityBadgeLabel(pulled.card.rarity);
  const badgeColors = getRarityBadgeColors(pulled.card.rarity);

  return (
    <View
      style={[
        styles.face,
        { width, height },
        glow
          ? Platform.select({
              web: { boxShadow: `0 0 28px ${glow}88, 0 18px 40px rgba(0,0,0,0.5)` },
              default: {
                shadowColor: glow,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 16,
                elevation: 12,
              },
            })
          : null,
      ]}
    >
      {imageUri ? (
        <CardImage
          uri={imageUri}
          fallbackUri={pulled.card.images?.small || pulled.card.images?.large}
          width={width}
          height={height}
          recyclingKey={pulled.card.id}
          style={styles.faceImage}
        />
      ) : (
        <View style={[styles.facePlaceholder, { width, height }]}>
          <Text style={styles.facePlaceholderText}>🃏</Text>
        </View>
      )}
      {pulled.isNew ? (
        <View style={[styles.newBadge, compact && styles.newBadgeCompact]}>
          <Text style={[styles.newBadgeText, compact && styles.newBadgeTextCompact]}>NEW</Text>
        </View>
      ) : null}
      {rarityLabel ? (
        <View
          style={[
            styles.rarityBadge,
            compact && styles.rarityBadgeCompact,
            { backgroundColor: badgeColors.backgroundColor },
          ]}
        >
          <Text
            style={[
              styles.rarityBadgeText,
              compact && styles.rarityBadgeTextCompact,
              { color: badgeColors.color },
            ]}
          >
            {rarityLabel}
          </Text>
        </View>
      ) : null}
      {/* PREMIUM manda sobre ALT: una premium ya es alternativa, y dos
          insignias en la misma esquina se pisarian. */}
      {pulled.isPremium ? (
        <View style={[styles.altBadge, styles.premiumBadge, compact && styles.altBadgeCompact]}>
          <Text style={styles.altBadgeText}>PREMIUM</Text>
        </View>
      ) : pulled.isAltArt ? (
        <View style={[styles.altBadge, compact && styles.altBadgeCompact]}>
          <Text style={styles.altBadgeText}>ALT</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 8, 18, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    zIndex: 100,
  },
  sealedHint: {
    color: colors.goldBright,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  wrapper: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(232, 185, 35, 0.5)',
    backgroundColor: colors.surface,
  },
  /** Con arte real el sobre se muestra suelto, sin marco ni fondo. */
  wrapperBare: {
    overflow: 'hidden',
  },
  wrapperInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceRaised,
  },
  wrapperSet: {
    color: colors.goldBright,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  wrapperName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  wrapperFoot: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cutGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 213, 79, 0.85)',
  },
  counter: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  revealArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackGhost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(20, 50, 92, 0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ translateY: 10 }, { scale: 0.96 }],
  },
  stackGhostSecond: {
    opacity: 0.6,
    transform: [{ translateY: 20 }, { scale: 0.92 }],
  },
  halo: {
    position: 'absolute',
    borderRadius: 18,
  },
  /** Recorta el destello a la silueta de la carta, sin envolverla. */
  shineClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shineBar: {
    position: 'absolute',
    top: '-50%',
    width: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  revealCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  faceImage: {
    borderRadius: radii.lg,
  },
  facePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  facePlaceholderText: {
    fontSize: 32,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.wave,
  },
  newBadgeCompact: {
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#06121f',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  newBadgeTextCompact: {
    fontSize: 9,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  rarityBadgeCompact: {
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rarityBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  rarityBadgeTextCompact: {
    fontSize: 9,
  },
  altBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.raritySec,
  },
  premiumBadge: {
    backgroundColor: colors.goldInk,
  },
  altBadgeCompact: {
    bottom: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  altBadgeText: {
    color: '#20030f',
    fontSize: 10,
    fontWeight: '900',
  },
  skipBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  skipBtnPaired: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  skipLabelPaired: {
    color: colors.text,
  },
  revealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  /**
   * Los dos botones comparten forma y alto: solo se distinguen por el color,
   * que es lo que dice cuál es el atajo y cuál la salida.
   */
  actionBtn: {
    minHeight: 44,
    minWidth: 168,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  jumpBtn: {
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceRaised,
  },
  jumpLabel: {
    color: colors.goldInk,
  },
  summaryPanel: {
    width: '92%',
    maxWidth: 860,
    maxHeight: '86%',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryTitle: {
    color: colors.goldInk,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryCounts: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  /** La repetida se atenúa para que la nueva destaque de un vistazo. */
  summaryItemDupe: {
    opacity: 0.45,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  summaryItem: {
    width: 96,
  },
  commitBtn: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  commitLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
});
