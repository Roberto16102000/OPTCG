import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
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
  onPress: () => void;
}

export function SetProgressRow({ setName, owned, total, cover, onPress }: SetProgressRowProps) {
  const { getDisplayImageUri } = useImageRegion();
  const pct = total ? Math.min(100, Math.round((owned / total) * 100)) : 0;
  const code = getSetCodeFromName(setName);
  const artKey = code?.replace(/[^A-Z0-9]/gi, '').toUpperCase() ?? '';
  const boosterUri = getBoosterImageUriForSetCode(code);
  const coverUri = !boosterUri && cover ? getDisplayImageUri(cover) : undefined;
  // Sin arte de sobre (mazos ST y productos sueltos) el icono distingue familia.
  const fallbackIcon = code?.toUpperCase().startsWith('ST')
    ? 'sword-cross'
    : 'star-four-points-outline';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
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
            {formatSetDisplayName(setName)}
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
      <Text style={styles.pctLabel}>{pct}% complete</Text>
    </Pressable>
  );
}

const THUMB_HEIGHT = 54;

const styles = StyleSheet.create({
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
