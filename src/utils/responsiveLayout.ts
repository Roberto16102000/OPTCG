/**
 * Aritmética de disposición que dependía del ancho de la ventana y vivía suelta
 * dentro de los componentes. Aquí es comprobable: `npm run check:responsive`
 * la ejecuta sobre un barrido de anchos y verifica que ninguna fila mide más
 * que su contenedor.
 *
 * Las fórmulas son las mismas que había, movidas tal cual.
 */
import { breakpoints, spacing } from '../constants/theme';

/* ------------------------------------------------------------------ binder */

/** Ancho de la columna de ajustes cuando hay sitio para ponerla al lado. */
const BINDER_SETTINGS_WIDTH = 260;
/** Más allá de esto el álbum deja de crecer. */
const BINDER_MAX_WIDTH = 1500;
/** Ancho de tablero a partir del cual caben dos hojas abiertas. */
const BINDER_SPREAD_MIN = 720;
const SLOT_MIN = 44;
const SLOT_MAX = 120;
/** Proporción de una carta en su hueco. */
export const CARD_RATIO = 1.39;

export interface BinderBoard {
  narrow: boolean;
  /** Dos hojas abiertas, como un archivador real. */
  spread: boolean;
  sheets: number;
  boardWidth: number;
  pageWidth: number;
  slotWidth: number;
  slotHeight: number;
}

export function getBinderBoard(windowWidth: number, cols: number): BinderBoard {
  const narrow = windowWidth < breakpoints.compact;
  const settingsWidth = narrow ? 0 : BINDER_SETTINGS_WIDTH + spacing.md;
  const boardWidth = Math.min(windowWidth, BINDER_MAX_WIDTH) - spacing.md * 2 - settingsWidth;
  const spread = !narrow && boardWidth >= BINDER_SPREAD_MIN;
  const sheets = spread ? 2 : 1;
  const pageWidth = Math.floor((boardWidth - spacing.md * 3) / sheets);
  const slotWidth = Math.max(
    SLOT_MIN,
    Math.min(SLOT_MAX, Math.floor((pageWidth - spacing.sm * 3 - cols * spacing.sm) / cols))
  );
  return {
    narrow,
    spread,
    sheets,
    boardWidth,
    pageWidth,
    slotWidth,
    slotHeight: Math.round(slotWidth * CARD_RATIO),
  };
}

/* ---------------------------------------------- selector de cartas (binder) */

/** Tamaño de referencia de la ficha: decide cuántas columnas, no su ancho. */
const PICKER_TILE = 108;
/** Por debajo de esto la miniatura ya no se distingue. */
const PICKER_TILE_MIN = 60;
/** Lo que la ficha añade alrededor de la imagen: padding 4x2 + borde 2x2. */
export const PICKER_TILE_CHROME = 12;
/** Mínimo de columnas al apilar: con dos sobraba casi una ficha de hueco. */
const PICKER_STACKED_COLUMNS = 3;
const PICKER_FILTERS_WIDTH = 190;
const PICKER_SELECTED_WIDTH = 240;

export interface PickerGrid {
  wide: boolean;
  browserWidth: number;
  columns: number;
  tileWidth: number;
  tileHeight: number;
}

export function getPickerGrid(windowWidth: number): PickerGrid {
  const wide = windowWidth >= breakpoints.compact;
  const chrome =
    spacing.md * 2 +
    (wide ? PICKER_FILTERS_WIDTH + spacing.md + PICKER_SELECTED_WIDTH + spacing.md : 0);
  const browserWidth = Math.max(PICKER_TILE_MIN * PICKER_STACKED_COLUMNS, windowWidth - chrome);

  const natural = Math.round(
    (browserWidth + spacing.sm) / (PICKER_TILE + PICKER_TILE_CHROME + spacing.sm)
  );
  const columns = Math.max(wide ? 2 : PICKER_STACKED_COLUMNS, natural);
  const tileWidth = Math.max(
    PICKER_TILE_MIN,
    Math.floor((browserWidth - spacing.sm * (columns - 1)) / columns) - PICKER_TILE_CHROME
  );
  return {
    wide,
    browserWidth,
    columns,
    tileWidth,
    tileHeight: Math.round(tileWidth * CARD_RATIO),
  };
}

/* -------------------------------------------------- carrusel de sobres */

/** Ancho al que el carrusel se ve a tamaño completo. */
const CAROUSEL_FULL_WIDTH = 520;
/** Alto de ventana necesario para el sobre completo; en cortas se encoge. */
const CAROUSEL_FULL_HEIGHT = 840;
const CAROUSEL_MIN_SCALE = 0.58;

/** También manda el alto: el sobre no debe empujar los botones fuera. */
export function getCarouselScale(windowWidth: number, windowHeight: number): number {
  return Math.max(
    CAROUSEL_MIN_SCALE,
    Math.min(1, windowWidth / CAROUSEL_FULL_WIDTH, windowHeight / CAROUSEL_FULL_HEIGHT)
  );
}
