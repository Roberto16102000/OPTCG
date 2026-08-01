import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { OnePieceCard } from '../types/card';
import { colors, radii } from '../constants/theme';
import { useImageRegion } from '../context/ImageRegionContext';
import { getRarityBadgeColors, getRarityBadgeLabel, getRarityGlowColor, getRarityTileStyle } from '../utils/rarity';
import { CardImage } from './CardImage';

interface CatalogCardTileProps {
  card: OnePieceCard;
  width: number;
  height: number;
  onPress: () => void;
  onQuickAdd?: () => void;
  inCollection?: boolean;
  quantity?: number;
}

function CatalogCardTileInner({
  card,
  width,
  height,
  onPress,
  onQuickAdd,
  inCollection,
  quantity,
}: CatalogCardTileProps) {
  const { getDisplayImageUri } = useImageRegion();
  const imageUri = getDisplayImageUri(card);
  const glowColor = getRarityGlowColor(card.rarity);
  const rarityLabel = getRarityBadgeLabel(card.rarity);
  const rarityBadgeColors = getRarityBadgeColors(card.rarity);

  return (
    <View style={[styles.outer, { width, height }, getRarityTileStyle(card.rarity)]}>
      <Pressable
        style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityLabel={`${card.name} ${card.code}`}
      >
        <View
          style={[
            styles.frame,
            inCollection && styles.frameOwned,
            glowColor ? { borderColor: `${glowColor}55` } : null,
          ]}
        >
          {imageUri ? (
            <CardImage
              uri={imageUri}
              fallbackUri={card.images?.small || card.images?.large}
              width={width}
              height={height}
              priority="low"
              recyclingKey={card.id}
              style={styles.image}
            />
          ) : (
            <View style={[styles.placeholder, { width, height }]}>
              <Text style={styles.placeholderText}>🃏</Text>
            </View>
          )}
          <View style={styles.badges}>
            {rarityLabel ? (
              <View style={[styles.badgeRarity, { backgroundColor: rarityBadgeColors.backgroundColor }]}>
                <Text
                  style={[styles.badgeRarityText, { color: rarityBadgeColors.color }]}
                  numberOfLines={1}
                >
                  {rarityLabel}
                </Text>
              </View>
            ) : null}
            {inCollection ? (
              <View style={styles.badgeOwned}>
                <Text style={styles.badgeOwnedText}>
                  {quantity && quantity > 1 ? `×${quantity}` : '✓'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      {onQuickAdd ? (
        <Pressable
          style={({ pressed }) => [
            styles.quickAddBtn,
            inCollection && styles.quickAddBtnOwned,
            pressed && styles.quickAddBtnPressed,
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            onQuickAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel={
            inCollection ? `Añadir otra copia de ${card.name}` : `Añadir ${card.name} a la colección`
          }
        >
          <View style={styles.quickAddGlyph}>
            <Text style={styles.quickAddText} allowFontScaling={false}>
              +
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radii.md,
    position: 'relative',
  },
  cardPress: {
    flex: 1,
    borderRadius: radii.md,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  frame: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  frameOwned: {
    borderColor: colors.success,
  },
  image: {
    borderRadius: radii.sm,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  placeholderText: { fontSize: 32, opacity: 0.4 },
  badges: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
  },
  badgeRarity: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '48%',
  },
  badgeRarityText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeOwned: {
    marginLeft: 'auto',
    backgroundColor: colors.success,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeOwnedText: { color: '#052e12', fontSize: 10, fontWeight: '800' },
  quickAddBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bountyRed,
    borderWidth: 2,
    borderColor: colors.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
  },
  quickAddBtnOwned: {
    backgroundColor: colors.success,
    borderColor: '#ecfdf5',
  },
  quickAddBtnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.9,
  },
  quickAddGlyph: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
    marginTop: Platform.select({ ios: -1, web: -2, default: 0 }),
  },
});

export const CatalogCardTile = memo(CatalogCardTileInner);
