import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OnePieceCard } from '../types/card';
import { colors, spacing } from '../constants/theme';
import { useImageRegion } from '../context/ImageRegionContext';
import { CardImage } from './CardImage';

const IMAGE_WIDTH = 72;
const IMAGE_HEIGHT = 100;

interface CardItemProps {
  card: OnePieceCard;
  onPress: () => void;
  onAddPress?: () => void;
  inCollection?: boolean;
  quantity?: number;
}

function CardItemInner({
  card,
  onPress,
  onAddPress,
  inCollection,
  quantity,
}: CardItemProps) {
  const { getDisplayImageUri } = useImageRegion();
  const imageUri = getDisplayImageUri(card);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={onPress}
      >
        {imageUri ? (
          <CardImage
            uri={imageUri}
            fallbackUri={card.images?.small || card.images?.large}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            priority="low"
            recyclingKey={card.id}
            trimId={card.id}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>🃏</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {card.name}
          </Text>
          <Text style={styles.code}>{card.code}</Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>{card.rarity}</Text>
            <Text style={styles.tag}>{card.color}</Text>
          </View>
        </View>
        {inCollection && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {quantity && quantity > 1 ? `×${quantity}` : '✓'}
            </Text>
          </View>
        )}
      </Pressable>
      {onAddPress && (
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={onAddPress}
          accessibilityLabel="Add to my collection"
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  addBtnPressed: { opacity: 0.85 },
  addBtnText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  imagePlaceholder: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 28, opacity: 0.5 },
  info: { flex: 1, marginLeft: spacing.md },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  code: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  tag: {
    color: colors.accent,
    fontSize: 11,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: colors.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

export const CardItem = memo(CardItemInner);
