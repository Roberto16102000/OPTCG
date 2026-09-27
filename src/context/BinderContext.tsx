import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as binderStorage from '../storage/binder';
import {
  createBinderDoc,
  emptyLibrary,
  slotsPerPage,
  type BinderDoc,
  type BinderLibrary,
  type CoverBox,
  type GridSizeId,
} from '../storage/binder';

interface BinderValue {
  /** Todos los binders guardados, del más reciente al más antiguo. */
  binders: BinderDoc[];
  /** El abierto ahora mismo; `null` cuando se está en la estantería. */
  binder: BinderDoc | null;
  loading: boolean;
  totalPages: number;
  perPage: number;
  /** Índices absolutos de los huecos de una página. */
  pageSlots: (page: number) => number[];
  createBinder: (title: string, description?: string) => string;
  openBinder: (id: string | null) => void;
  renameBinder: (id: string, title: string, description?: string) => void;
  deleteBinder: (id: string) => void;
  duplicateBinder: (id: string) => void;
  setCard: (slotIndex: number, cardId: string | null) => void;
  /** Coloca varias a partir de un hueco, saltando los ocupados. */
  fillFrom: (startIndex: number, cardIds: string[]) => void;
  swapSlots: (a: number, b: number) => void;
  addPage: () => void;
  removeLastPage: () => void;
  setGridSize: (size: GridSizeId) => void;
  setTitle: (title: string) => void;
  /** Portada del binder abierto; `null` la quita. */
  setCover: (cover: string | null, aspect?: number | null) => void;
  /** Recuadro elegido a mano para esa portada. */
  setCoverBox: (box: CoverBox) => void;
  /** Vacía los huecos del binder abierto, sin borrarlo. */
  clearAll: () => void;
}

const BinderContext = createContext<BinderValue | null>(null);

export function BinderProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<BinderLibrary>(emptyLibrary);
  const [loading, setLoading] = useState(true);
  /**
   * Solo se guarda tras un cambio del usuario. Sin esto, un arranque en el que
   * la lectura fallara escribiría la biblioteca vacía encima de la buena.
   */
  const dirty = useRef(false);

  useEffect(() => {
    binderStorage
      .loadLibrary()
      .then(setLibrary)
      .finally(() => setLoading(false));
  }, []);

  /**
   * Todo cambio persiste: el binder es el trabajo del usuario, no una vista.
   * Se guarda como efecto y se muta en forma funcional para que dos acciones
   * seguidas en el mismo tick no partan las dos del mismo estado.
   */
  useEffect(() => {
    if (loading || !dirty.current) return;
    binderStorage.saveLibrary(library).catch((err) => {
      console.warn('No se pudo guardar el binder', err);
    });
  }, [library, loading]);

  const binder = useMemo(
    () => library.binders.find((doc) => doc.id === library.activeId) ?? null,
    [library]
  );

  /** Aplica un cambio al binder abierto y le pone fecha. */
  const mutate = useCallback((fn: (prev: BinderDoc) => BinderDoc) => {
    dirty.current = true;
    setLibrary((prev) => {
      if (!prev.activeId) return prev;
      return {
        ...prev,
        binders: prev.binders.map((doc) =>
          doc.id === prev.activeId ? { ...fn(doc), updatedAt: new Date().toISOString() } : doc
        ),
      };
    });
  }, []);

  const createBinder = useCallback((title: string, description = '') => {
    dirty.current = true;
    const doc = { ...createBinderDoc(title), description };
    // Se abre nada más crearlo: es lo que se quiere hacer a continuación.
    setLibrary((prev) => ({ binders: [doc, ...prev.binders], activeId: doc.id }));
    return doc.id;
  }, []);

  const openBinder = useCallback((id: string | null) => {
    dirty.current = true;
    setLibrary((prev) => ({ ...prev, activeId: id }));
  }, []);

  const renameBinder = useCallback((id: string, title: string, description?: string) => {
    dirty.current = true;
    setLibrary((prev) => ({
      ...prev,
      binders: prev.binders.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              title: title.trim() || doc.title,
              description: description ?? doc.description,
              updatedAt: new Date().toISOString(),
            }
          : doc
      ),
    }));
  }, []);

  const deleteBinder = useCallback((id: string) => {
    dirty.current = true;
    setLibrary((prev) => ({
      binders: prev.binders.filter((doc) => doc.id !== id),
      activeId: prev.activeId === id ? null : prev.activeId,
    }));
  }, []);

  const duplicateBinder = useCallback((id: string) => {
    dirty.current = true;
    setLibrary((prev) => {
      const source = prev.binders.find((doc) => doc.id === id);
      if (!source) return prev;
      const copy: BinderDoc = {
        ...createBinderDoc(`${source.title} (copia)`, source.gridSize),
        description: source.description,
        cover: source.cover,
        coverAspect: source.coverAspect,
        coverBox: source.coverBox,
        slots: [...source.slots],
      };
      return { ...prev, binders: [copy, ...prev.binders] };
    });
  }, []);

  const perPage = binder ? slotsPerPage(binder.gridSize) : 9;
  const totalPages = binder ? Math.max(1, Math.ceil(binder.slots.length / perPage)) : 1;

  const pageSlots = useCallback(
    (page: number) => {
      const start = (page - 1) * perPage;
      return Array.from({ length: perPage }, (_, i) => start + i);
    },
    [perPage]
  );

  const setCard = useCallback(
    (slotIndex: number, cardId: string | null) => {
      mutate((prev) => {
        const slots = [...prev.slots];
        // La página puede pedir un hueco que aún no existe en el array.
        while (slots.length <= slotIndex) slots.push(null);
        slots[slotIndex] = cardId;
        return { ...prev, slots };
      });
    },
    [mutate]
  );

  const fillFrom = useCallback(
    (startIndex: number, cardIds: string[]) => {
      if (!cardIds.length) return;
      mutate((prev) => {
        const size = slotsPerPage(prev.gridSize);
        const slots = [...prev.slots];
        let cursor = startIndex;
        for (const id of cardIds) {
          // Respeta lo ya colocado: busca el siguiente hueco libre.
          while (slots[cursor] != null && cursor < slots.length) cursor += 1;
          // Si no quedan huecos, crece por páginas completas.
          while (cursor >= slots.length) slots.push(...Array(size).fill(null));
          slots[cursor] = id;
          cursor += 1;
        }
        return { ...prev, slots };
      });
    },
    [mutate]
  );

  const swapSlots = useCallback(
    (a: number, b: number) => {
      mutate((prev) => {
        const slots = [...prev.slots];
        while (slots.length <= Math.max(a, b)) slots.push(null);
        [slots[a], slots[b]] = [slots[b], slots[a]];
        return { ...prev, slots };
      });
    },
    [mutate]
  );

  const addPage = useCallback(() => {
    mutate((prev) => {
      const size = slotsPerPage(prev.gridSize);
      if (Math.ceil(prev.slots.length / size) >= binderStorage.MAX_PAGES) return prev;
      return { ...prev, slots: [...prev.slots, ...Array(size).fill(null)] };
    });
  }, [mutate]);

  const removeLastPage = useCallback(() => {
    mutate((prev) => {
      const size = slotsPerPage(prev.gridSize);
      if (prev.slots.length <= size) return prev;
      return { ...prev, slots: prev.slots.slice(0, -size) };
    });
  }, [mutate]);

  const setGridSize = useCallback(
    (size: GridSizeId) => {
      // Cambiar de rejilla recoloca: se conservan las cartas en orden y se
      // rellena hasta completar la última página.
      mutate((prev) => {
        const filled = prev.slots.filter((id): id is string => Boolean(id));
        const next = slotsPerPage(size);
        const pages = Math.max(1, Math.ceil(filled.length / next));
        const slots: (string | null)[] = Array(pages * next).fill(null);
        filled.forEach((id, i) => {
          slots[i] = id;
        });
        return { ...prev, gridSize: size, slots };
      });
    },
    [mutate]
  );

  const setTitle = useCallback(
    (title: string) => mutate((prev) => ({ ...prev, title: title.trim() || prev.title })),
    [mutate]
  );

  const setCover = useCallback(
    (cover: string | null, aspect: number | null = null) =>
      // Cambiar de foto reinicia el encuadre: el de la anterior no vale.
      mutate((prev) => ({ ...prev, cover, coverAspect: aspect, coverBox: null })),
    [mutate]
  );

  const setCoverBox = useCallback(
    (box: CoverBox) => mutate((prev) => ({ ...prev, coverBox: box })),
    [mutate]
  );

  const clearAll = useCallback(() => {
    mutate((prev) => ({ ...prev, slots: Array(slotsPerPage(prev.gridSize)).fill(null) }));
  }, [mutate]);

  const value = useMemo(
    () => ({
      binders: library.binders,
      binder,
      loading,
      totalPages,
      perPage,
      pageSlots,
      createBinder,
      openBinder,
      renameBinder,
      deleteBinder,
      duplicateBinder,
      setCard,
      fillFrom,
      swapSlots,
      addPage,
      removeLastPage,
      setGridSize,
      setTitle,
      setCover,
      setCoverBox,
      clearAll,
    }),
    [
      library.binders,
      binder,
      loading,
      totalPages,
      perPage,
      pageSlots,
      createBinder,
      openBinder,
      renameBinder,
      deleteBinder,
      duplicateBinder,
      setCard,
      fillFrom,
      swapSlots,
      addPage,
      removeLastPage,
      setGridSize,
      setTitle,
      setCover,
      setCoverBox,
      clearAll,
    ]
  );

  return <BinderContext.Provider value={value}>{children}</BinderContext.Provider>;
}

export function useBinder() {
  const ctx = useContext(BinderContext);
  if (!ctx) throw new Error('useBinder debe usarse dentro de BinderProvider');
  return ctx;
}
