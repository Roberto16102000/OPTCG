import AsyncStorage from '@react-native-async-storage/async-storage';

const LIBRARY_KEY = '@onepiece/binders';
/** Clave de cuando solo había un binder; se migra la primera vez y se borra. */
const LEGACY_KEY = '@onepiece/binder';

/** Rejillas disponibles, como en un archivador real. */
export const GRID_SIZES = [
  { id: '2x2', cols: 2, rows: 2 },
  { id: '3x3', cols: 3, rows: 3 },
  { id: '4x3', cols: 4, rows: 3 },
  { id: '4x4', cols: 4, rows: 4 },
] as const;

export type GridSizeId = (typeof GRID_SIZES)[number]['id'];

export const MAX_PAGES = 100;

export interface BinderDoc {
  id: string;
  title: string;
  description: string;
  /** Portada elegida por el usuario, como data URI ya reescalado. */
  cover: string | null;
  /** Ancho/alto de esa foto, para acotar cuánto se puede mover. */
  coverAspect: number | null;
  /**
   * Recuadro de la foto dentro de la hoja, elegido a mano. Va en fracciones
   * del marco y no en píxeles porque la hoja cambia de tamaño con la rejilla
   * y con la pantalla.
   */
  coverBox: CoverBox | null;
  gridSize: GridSizeId;
  /**
   * Un hueco por posición, en orden de lectura. `null` es hueco vacío y es un
   * valor válido: el binder guarda cómo están colocadas las cartas, no cuáles
   * se tienen, así que los huecos son parte de la información.
   */
  slots: (string | null)[];
  createdAt: string;
  updatedAt: string;
}

export interface CoverBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Recuadro que llena la hoja conservando la proporción de la foto. */
export function coverFillBox(imageAspect: number, frameAspect: number): CoverBox {
  const width = Math.max(1, imageAspect / frameAspect);
  const height = Math.max(1, frameAspect / imageAspect);
  return { left: (1 - width) / 2, top: (1 - height) / 2, width, height };
}

/** Recuadro que muestra la foto entera, con margen si hace falta. */
export function coverContainBox(imageAspect: number, frameAspect: number): CoverBox {
  const width = Math.min(1, imageAspect / frameAspect);
  const height = Math.min(1, frameAspect / imageAspect);
  return { left: (1 - width) / 2, top: (1 - height) / 2, width, height };
}

export interface BinderLibrary {
  binders: BinderDoc[];
  /** Binder abierto. `null` es la estantería, que es un estado válido. */
  activeId: string | null;
}

export function gridOf(id: GridSizeId) {
  return GRID_SIZES.find((size) => size.id === id) ?? GRID_SIZES[1];
}

export function slotsPerPage(id: GridSizeId): number {
  const grid = gridOf(id);
  return grid.cols * grid.rows;
}

let seq = 0;

function newId(): string {
  seq += 1;
  return `bnd_${Date.now().toString(36)}_${seq}`;
}

export function createBinderDoc(title: string, gridSize: GridSizeId = '3x3'): BinderDoc {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: title.trim() || 'Binder sin nombre',
    description: '',
    cover: null,
    coverAspect: null,
    coverBox: null,
    gridSize,
    slots: Array(slotsPerPage(gridSize)).fill(null),
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyLibrary(): BinderLibrary {
  return { binders: [], activeId: null };
}

/** Rellena lo que falte: los guardados viejos no traen todos los campos. */
function normalize(raw: Partial<BinderDoc>, fallbackTitle: string): BinderDoc | null {
  if (!Array.isArray(raw.slots)) return null;
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'string' ? raw.id : newId(),
    title: typeof raw.title === 'string' && raw.title ? raw.title : fallbackTitle,
    description: typeof raw.description === 'string' ? raw.description : '',
    cover: typeof raw.cover === 'string' ? raw.cover : null,
    coverAspect: typeof raw.coverAspect === 'number' ? raw.coverAspect : null,
    coverBox: raw.coverBox ?? null,
    gridSize: (raw.gridSize as GridSizeId) ?? '3x3',
    slots: raw.slots,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export async function loadLibrary(): Promise<BinderLibrary> {
  const raw = await AsyncStorage.getItem(LIBRARY_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BinderLibrary;
      const binders = (parsed.binders ?? [])
        .map((doc) => normalize(doc, 'Mi binder'))
        .filter((doc): doc is BinderDoc => doc !== null);
      const activeId = binders.some((b) => b.id === parsed.activeId) ? parsed.activeId : null;
      return { binders, activeId };
    } catch {
      // Un guardado ilegible se aparta en vez de perderse: si algún día hay
      // que recuperarlo a mano, sigue estando.
      await AsyncStorage.setItem(`${LIBRARY_KEY}_corrupto`, raw);
      return emptyLibrary();
    }
  }

  // Migración del binder único: se conserva el trabajo ya hecho.
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const doc = normalize(JSON.parse(legacy) as Partial<BinderDoc>, 'Mi binder');
      if (doc) {
        const library: BinderLibrary = { binders: [doc], activeId: null };
        await saveLibrary(library);
        await AsyncStorage.removeItem(LEGACY_KEY);
        return library;
      }
    } catch {
      // Un guardado corrupto no debe impedir abrir la pantalla.
    }
  }

  return emptyLibrary();
}

export async function saveLibrary(library: BinderLibrary): Promise<void> {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

export async function clearLibrary(): Promise<void> {
  await AsyncStorage.removeItem(LIBRARY_KEY);
}
