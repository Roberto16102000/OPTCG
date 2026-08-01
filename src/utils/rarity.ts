import { Platform, type ViewStyle } from 'react-native';
import { colors } from '../constants/theme';

const RARE_RARITIES = new Set(['L', 'SEC', 'SP', 'SR', 'SR★', 'TR', 'P']);

export function isRareRarity(rarity: string | undefined): boolean {
  if (!rarity) return false;
  return RARE_RARITIES.has(rarity) || rarity.startsWith('SR');
}

export function getRarityGlowColor(rarity: string | undefined): string | null {
  if (!rarity) return null;
  if (rarity === 'SEC' || rarity === 'SP CARD' || rarity.startsWith('SP')) return colors.raritySec;
  if (rarity === 'L') return colors.rarityL;
  if (rarity.startsWith('SR')) return colors.raritySr;
  if (rarity === 'R') return colors.rarityR;
  if (rarity === 'TR') return colors.gold;
  if (rarity === 'UC') return colors.rarityUc;
  if (rarity === 'C') return colors.rarityC;
  if (rarity === 'P') return colors.gold;
  return null;
}

/** Luminancia relativa (WCAG) de un color `#rgb`/`#rrggbb`. */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(full.slice(0, 2), 16));
  const g = channel(parseInt(full.slice(2, 4), 16));
  const b = channel(parseInt(full.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Etiqueta corta para badge en tiles (p. ej. SP CARD → SP). */
export function getRarityBadgeLabel(rarity: string | undefined): string | null {
  if (!rarity?.trim()) return null;
  if (rarity === 'SP CARD') return 'SP';
  return rarity;
}

export function getRarityBadgeColors(rarity: string | undefined): {
  backgroundColor: string;
  color: string;
} {
  const glow = getRarityGlowColor(rarity);
  if (!glow) return { backgroundColor: colors.surfaceRaised, color: colors.text };
  // El color del texto se deduce del fondo, así que sigue siendo legible aunque
  // se retoquen los tonos de rareza en el theme.
  const darkText = relativeLuminance(glow) > 0.4;
  return { backgroundColor: glow, color: darkText ? '#1a1000' : '#fff' };
}

export function getRarityTileStyle(rarity: string | undefined): ViewStyle {
  const glow = getRarityGlowColor(rarity);
  if (!glow) return {};
  return Platform.select({
    web: {
      boxShadow: `0 0 16px ${glow}66, 0 8px 24px rgba(0,0,0,0.45)`,
    },
    default: {
      shadowColor: glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.65,
      shadowRadius: 10,
      elevation: 8,
    },
  }) as ViewStyle;
}
