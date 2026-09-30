import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';
import { useImageRegion } from '../../context/ImageRegionContext';
import type { OnePieceCard } from '../../types/card';
import { getCardColorHex, getPrimaryCardColor } from '../../utils/collectionView';
import { getRarityBadgeLabel, getRarityGlowColor } from '../../utils/rarity';
import { CardImage } from '../CardImage';

interface CollectionGridItemProps {
  card: OnePieceCard;
  width: number;
  imageHeight: number;
  owned: boolean;
  quantity?: number;
  onPress: () => void;
}

export function CollectionGridItem({
  card,
  width,
  imageHeight,
  owned,
  quantity,
  onPress,
}: CollectionGridItemProps) {
  const { getDisplayImageUri } = useImageRegion();
  const imageUri = getDisplayImageUri(card);
  const rarityLabel = getRarityBadgeLabel(card.rarity) ?? '—';
  const rarityColor = getRarityGlowColor(card.rarity) ?? colors.textMuted;
  const primaryColor = getPrimaryCardColor(card);
  const colorHex = getCardColorHex(primaryColor);

  if (!owned) {
    return (
      <Pressable style={[styles.wrap, { width }]} onPress={onPress}>
        <View style={[styles.missingFrame, { width, height: imageHeight }]}>
          <Text style={styles.missingIcon}>🃏</Text>
          <Text style={styles.missingLabel}>Not Collected</Text>
          <View style={styles.missingBadge}>
            <View style={styles.missingCircle} />
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.nameMuted} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.code}>{card.code}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.wrap, { width }]} onPress={onPress}>
      <View
        style={[
          styles.frame,
          { width, height: imageHeight },
          { borderColor: `${rarityColor}44` },
        ]}
      >
        {imageUri ? (
            <CardImage
              lazy
              uri={imageUri}
              fallbackUri={card.images?.small || card.images?.large}
              width={width}
            height={imageHeight}
            priority="low"
            recyclingKey={card.id}
            style={styles.image}
            cardId={card.id}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🃏</Text>
          </View>
        )}
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedBadgeText}>
            {quantity && quantity > 1 ? `×${quantity}` : '✓'}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.code}>{card.code}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.rarity, { color: rarityColor }]}>{rarityLabel}</Text>
          <View style={styles.colorTag}>
            <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
            <Text style={styles.colorText}>{primaryColor}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    position: 'relative',
  },
  frame: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  missingFrame: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.65,
    position: 'relative',
  },
  missingIcon: {
    fontSize: 28,
    opacity: 0.35,
  },
  missingLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missingBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  missingCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
  },
  image: {
    borderRadius: radii.sm,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  placeholderText: { fontSize: 28, opacity: 0.4 },
  ownedBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  ownedBadgeText: {
    color: '#052e12',
    fontSize: 10,
    fontWeight: '800',
  },
  meta: {
    marginTop: spacing.xs,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  nameMuted: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  code: {
    color: colors.textMuted,
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rarity: {
    fontSize: 11,
    fontWeight: '800',
  },
  colorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
