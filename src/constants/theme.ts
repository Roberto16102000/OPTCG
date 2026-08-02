/**
 * Design system — One Piece TCG · «Grand Line diurno».
 *
 * Paleta de mar abierto a plena luz: cielo y agua clara como base, arena de
 * isla para las superficies cálidas y madera de barco para los acentos. El oro
 * del tesoro y el rojo de bandera se conservan como color de marca.
 *
 * Cuidado al añadir tokens: sobre fondo claro el oro brillante no vale como
 * color de texto (contraste insuficiente). Para texto usar `goldInk`, y dejar
 * `gold`/`goldBright` solo para rellenos y bordes.
 *
 * Nota: `CardDetailModal` (póster WANTED) NO consume estos tokens a propósito;
 * lleva sus valores congelados para que un cambio de tema no lo altere.
 */

/** Paleta base. No usar directamente en pantalla: preferir los tokens semánticos. */
const palette = {
  // Cielo y mar a mediodía.
  sky: '#eaf5fd',
  seaLight: '#d3e9f7',
  sea: '#7cc4e8',
  seaDeep: '#1b6fa8',
  seaInk: '#0d3f61',

  // Arena e isla.
  sand: '#f7efdd',
  sandDeep: '#e8d8b8',

  // Madera de barco.
  wood: '#8b5e34',
  woodDark: '#5c3d21',

  // Tesoro.
  gold: '#e8b923',
  goldBright: '#ffd54f',
  goldInk: '#8a6410',

  // Bandera pirata.
  red: '#c41e3a',
  redBright: '#e63946',
  redDeep: '#8b1530',

  // Tinta y neutros.
  ink: '#10293b',
  inkSoft: '#4c6b80',
  inkFaint: '#8aa3b4',
  white: '#ffffff',

  // Señales.
  green: '#15803d',
  amber: '#b45309',
  rose: '#dc2626',
};

export const colors = {
  // --- Superficies ---
  background: palette.sky,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceSunken: palette.seaLight,
  /** Anclaje oscuro dentro del tema claro: barra lateral y overlay de apertura. */
  surfaceDark: palette.seaInk,
  surfaceDarkRaised: '#14547f',
  gridPanel: palette.sky,
  glass: 'rgba(255, 255, 255, 0.86)',
  toolbarBg: 'rgba(255, 255, 255, 0.95)',
  scrim: 'rgba(13, 63, 97, 0.55)',
  sand: palette.sand,
  sandDeep: palette.sandDeep,

  // --- Marca ---
  primary: palette.red,
  primaryDark: palette.redDeep,
  primaryBright: palette.redBright,
  accent: palette.seaDeep,
  gold: palette.gold,
  goldBright: palette.goldBright,
  /** Oro legible como texto sobre fondo claro. */
  goldInk: palette.goldInk,
  goldDeep: palette.goldInk,
  bountyRed: palette.red,
  strawRed: palette.redBright,
  wave: palette.sea,
  wood: palette.wood,
  parchment: palette.sand,

  // --- Texto ---
  text: palette.ink,
  textMuted: palette.inkSoft,
  textFaint: palette.inkFaint,
  textOnGold: '#3a2a04',
  textOnPrimary: palette.white,
  textOnDark: palette.white,

  // --- Bordes ---
  border: 'rgba(27, 111, 168, 0.22)',
  borderStrong: 'rgba(27, 111, 168, 0.42)',
  borderGold: 'rgba(232, 185, 35, 0.6)',

  // --- Señales ---
  success: palette.green,
  warning: palette.amber,
  error: palette.rose,

  // --- Rarezas (tonos oscurecidos para leerse sobre claro) ---
  raritySec: '#c2185b',
  rarityL: palette.amber,
  raritySr: '#7b3fb8',
  rarityR: '#1d64d8',
  rarityUc: palette.green,
  rarityC: palette.inkSoft,
};

/**
 * Superficie de pergamino: papel y tinta, el mismo lenguaje del póster WANTED.
 * La usa la barra lateral, que por eso no sigue los tokens de superficie clara.
 */
export const parchment = {
  surface: '#f2e4c6',
  surfaceRaised: '#faf2de',
  /** Canto derecho, como el borde tostado del papel. */
  edge: '#c9a25f',
  ink: '#5c3d21',
  /** Medido sobre `surface`: #8b5e34 daba 4.45:1 y no llegaba a AA. */
  inkSoft: '#7d522d',
  /** Rojo lacre para el estado activo. */
  accent: '#7a1226',
  accentWash: 'rgba(122, 18, 38, 0.1)',
  rule: 'rgba(92, 61, 33, 0.25)',
  gold: '#a8781f',
} as const;

/**
 * Puntos de corte. Por debajo de `compact` la barra lateral se contrae sola y
 * los paneles laterales pasan a apilarse: a 375 px la barra expandida se comía
 * el 59 % del ancho.
 */
export const breakpoints = {
  compact: 760,
  medium: 1080,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 22,
  pill: 999,
};

/** Escala tipográfica. `display` y `title` van en versalitas para el tono de cartel. */
export const typography = {
  display: { fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 0.4 },
  heading: { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  body: { fontSize: 14, fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  caption: { fontSize: 11, fontWeight: '600' },
} as const;

/** Sombras. Sobre fondo claro van suaves y azuladas, no negras. */
export const elevation = {
  low: {
    shadowColor: palette.seaInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: palette.seaInk,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  high: {
    shadowColor: palette.seaInk,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  gold: {
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;
