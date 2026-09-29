import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { formatSetDisplayName, getSetCodeFromName } from '../utils/cards';
import { getArtCrop, getBoosterImageUriForSetCode } from '../utils/boosterImages';
import { useImageRegion } from '../context/ImageRegionContext';
import type { OnePieceCard } from '../types/card';
import { CardImage } from './CardImage';
import { BoosterArt } from './packs/BoosterArt';

interface SetProgressRowProps {
  setName: string;
  owned: number;
  total: number;
  /** Carta de respaldo cuando el set no tiene arte de producto. */
  cover?: OnePieceCard | null;
  /** Cartas del set, en orden de numeración, para la rejilla desplegable. */
  cards?: OnePieceCard[];
  isInCollection?: (cardId: string) => boolean;
  /** Nombre y código ya resueltos, para quien no tenga un `setName` del catálogo. */
  displayName?: string;
  codeOverride?: string;
  /**
   * Arte a usar, cuando no se deduce del código. Las colecciones de promos no
   * llevan código entre corchetes, así que sin esto caerían a la carta.
   */
  artKey?: string;
  onPress: () => void;
}

/** `OP01-005` → `005`; si no encaja, se usa el código entero. */
function cardNumber(code: string | undefined): string {
  const match = code?.match(/-(\w+)$/);
  return match ? match[1] : code ?? '—';
}

export function SetProgressRow({
  setName,
  owned,
  total,
  cover,
  cards,
  isInCollection,
  displayName,
  codeOverride,
  artKey: artKeyProp,
  onPress,
}: SetProgressRowProps) {
  const [expanded, setExpanded] = useState(false);
  /** Ancho real de la rejilla; los huecos se reparten sobre él. */
  const [gridWidth, setGridWidth] = useState(0);

  /*
    Antes el hueco era fijo en 62 px y la fila se quedaba en tres, dejando
    hueco muerto a la derecha. Ahora el hueco se calcula: cuatro por fila como
    mínimo y los que quepan si hay más sitio, repartiendo el ancho exacto.
  */
  const columns = gridWidth
    ? Math.max(MIN_SLOT_COLUMNS, Math.round((gridWidth + GRID_GAP) / (SLOT_WIDTH + GRID_GAP)))
    : MIN_SLOT_COLUMNS;
  const slotWidth = gridWidth
    ? Math.floor((gridWidth - GRID_GAP * (columns - 1)) / columns)
    : SLOT_WIDTH;
  const slotHeight = Math.round(slotWidth * (SLOT_HEIGHT / SLOT_WIDTH));
  const { getDisplayImageUri } = useImageRegion();
  const pct = total ? Math.min(100, Math.round((owned / total) * 100)) : 0;
  const code = codeOverride ?? getSetCodeFromName(setName);
  const artKey = artKeyProp ?? code?.replace(/[^A-Z0-9]/gi, '').toUpperCase() ?? '';
  const boosterUri = getBoosterImageUriForSetCode(artKeyProp ?? code);
  const coverUri = !boosterUri && cover ? getDisplayImageUri(cover) : undefined;
  // Sin arte de sobre (mazos ST y productos sueltos) el icono distingue familia.
  const fallbackIcon = code?.toUpperCase().startsWith('ST')
    ? 'sword-cross'
    : 'star-four-points-outline';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${displayName ?? formatSetDisplayName(setName)}, ${owned} de ${total}`}
        style={({ pressed }) => [pressed && styles.rowPressed]}
      >
      <View style={styles.top}>
        <View style={styles.thumb}>
          {boosterUri ? (
            <BoosterArt uri={boosterUri} height={THUMB_HEIGHT} crop={getArtCrop(artKey)} />
          ) : coverUri ? (
            <CardImage
              uri={coverUri}
              fallbackUri={cover?.images?.small}
              width={THUMB_HEIGHT * 0.72}
              height={THUMB_HEIGHT}
              priority="low"
              recyclingKey={cover?.id}
            />
          ) : (
            <MaterialDesignIcons
              name={fallbackIcon}
              size={22}
              color={colors.textMuted}
            />
          )}
        </View>
        <View style={styles.titles}>
          {code ? <Text style={styles.code}>{code}</Text> : null}
          <Text style={styles.name} numberOfLines={2}>
            {displayName ?? formatSetDisplayName(setName)}
          </Text>
        </View>
        <Text style={styles.fraction}>
          <Text style={styles.fractionOwned}>{owned}</Text>
          <Text style={styles.fractionSep}> / </Text>
          {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.footRow}>
        <Text style={styles.pctLabel}>{pct}% complete</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      </Pressable>

      {expanded ? (
        <View
          style={styles.grid}
          onLayout={(e) => {
            const w = Math.floor(e.nativeEvent.layout.width);
            if (w > 0 && w !== gridWidth) setGridWidth(w);
          }}
        >
          {(cards ?? []).map((card) => {
            const has = isInCollection?.(card.id) ?? false;
            const uri = has ? getDisplayImageUri(card) : undefined;
            return (
              <Pressable
                key={card.id}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={`${card.name}${has ? '' : ', te falta'}`}
                style={[
                  styles.slot,
                  { width: slotWidth, height: slotHeight },
                  !has && styles.slotMissing,
                ]}
              >
                {has && uri ? (
                  <CardImage
                    uri={uri}
                    fallbackUri={card.images?.small}
                    width={slotWidth}
                    height={slotHeight}
                    priority="low"
                    recyclingKey={card.id}
                    cardId={card.id}
                  />
                ) : (
                  <Text style={styles.slotNumber}>{cardNumber(card.code)}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const THUMB_HEIGHT = 54;
/** Tamaño de referencia del hueco: decide cuántos caben, no su ancho final. */
const SLOT_WIDTH = 62;
const SLOT_HEIGHT = 86;
/** Mínimo por fila: con tres sobraba casi un hueco de sitio. */
const MIN_SLOT_COLUMNS = 4;
const GRID_GAP = spacing.xs;

const styles = StyleSheet.create({
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 11,
  },
  /** Rejilla de huecos: la carta si la tienes, su número si te falta. */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: spacing.sm,
  },
  slot: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  slotMissing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotNumber: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '800',
  },
  thumb: {
    width: 36,
    height: THUMB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  row: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titles: { flex: 1 },
  code: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.goldInk,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  fraction: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  fractionOwned: { color: colors.goldInk, fontWeight: '800' },
  fractionSep: { color: colors.textMuted },
  track: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.gold,
    minWidth: 2,
  },
  pctLabel: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
