import type { ViewStyle } from 'react-native';

/** PNG `img/background.png` — medido: 1552×1013 */
export const WANTED_BG_ASPECT = 1552 / 1013;

export const WANTED_PANEL = {
  width: 940,
  height: Math.round(940 / WANTED_BG_ASPECT),
};

type Slot = { left: number; top: number; width: number; height: number };

/** Posiciones en % del lienzo (alineadas al PNG real) */
export const WANTED_SLOTS: Record<string, Slot> = {
  close: { left: 94.141, top: 4.004, width: 2.474, height: 4.297 },
  headerMeta: { left: 10.5, top: 4.8, width: 31, height: 4.6 },
  headerName: { left: 10.5, top: 8.6, width: 33.5, height: 7.6 },
  /** Ventana de carta en el pergamino */
  card: { left: 11.018, top: 19.2, width: 31.121, height: 64.2 },
  navPrev: { left: 5.5, top: 49, width: 5, height: 10 },
  navNext: { left: 40.5, top: 49, width: 5, height: 10 },
  statLife: { left: 47, top: 22, width: 14, height: 11 },
  statPower: { left: 61, top: 22, width: 14.5, height: 11 },
  statColor: { left: 73.2, top: 22, width: 15.5, height: 11 },
  price: { left: 47, top: 34, width: 45, height: 15 },
  type: { left: 47, top: 54.2, width: 45, height: 11 },
  effect: { left: 47, top: 65.8, width: 45, height: 13.5 },
  flavor: { left: 47, top: 79.2, width: 45, height: 5.5 },
  actions: { left: 46.5, top: 85.5, width: 49, height: 9.5 },
  verified: { left: 48, top: 95.5, width: 44, height: 3 },
};

export function wantedSlotStyle(slot: Slot): ViewStyle {
  return {
    position: 'absolute',
    left: `${slot.left}%`,
    top: `${slot.top}%`,
    width: `${slot.width}%`,
    height: `${slot.height}%`,
  };
}

export function wantedPanelSize(windowWidth: number, maxHeight: number, wide: boolean) {
  const width = wide ? WANTED_PANEL.width : windowWidth;
  const height = Math.min(wide ? WANTED_PANEL.height : maxHeight, width / WANTED_BG_ASPECT);
  return { width, height };
}

/** Proporción carta OPTCG */
export const CARD_ASPECT = 63 / 88;

/** Carta al máximo dentro del contorno, sin recortar */
export function wantedCardImageSize(
  panelWidth: number,
  panelHeight: number,
  slot: Slot = WANTED_SLOTS.card
) {
  const slotW = panelWidth * (slot.width / 100);
  const slotH = panelHeight * (slot.height / 100);
  let height = slotH * 0.97;
  let width = height * CARD_ASPECT;
  if (width > slotW * 0.97) {
    width = slotW * 0.97;
    height = width / CARD_ASPECT;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** Texto sobre cajas del arte (lado derecho) */
export const SLOT_INK = {
  text: '#2c1810',
  muted: '#5c4033',
  label: '#6b5344',
  price: '#8b1530',
  link: '#8b6914',
};
