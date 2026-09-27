import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CardImage } from '../../src/components/CardImage';
import { BinderLibrary } from '../../src/components/binder/BinderLibrary';
import { CardPickerModal } from '../../src/components/binder/CardPickerModal';
import { Panel, PirateButton, SectionHeading } from '../../src/components/ui';
import { breakpoints, colors, radii, spacing, typography } from '../../src/constants/theme';
import { useBinder } from '../../src/context/BinderContext';
import { useCollection } from '../../src/context/CollectionContext';
import { useImageRegion } from '../../src/context/ImageRegionContext';
import { useCatalogCards } from '../../src/hooks/useCatalogCards';
import {
  coverContainBox,
  coverFillBox,
  GRID_SIZES,
  gridOf,
  type CoverBox,
} from '../../src/storage/binder';
import { printBinder, type PrintableSlot } from '../../src/utils/binderPrint';
import { getBinderBoard } from '../../src/utils/responsiveLayout';
import { pickCoverImage } from '../../src/utils/coverImage';

/** Lado del tirador; los de Word rondan este tamaño y se agarran bien. */
const GRIP_SIZE = 14;

const GRIP_CURSOR: Record<string, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/** Botón cuadrado de la barra de páginas. */
function NavIcon({
  icon,
  label,
  onPress,
  disabled,
  accent,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.navIcon,
        accent && styles.navIconAccent,
        disabled && styles.navIconOff,
        pressed && !disabled && styles.slotPressed,
      ]}
    >
      <MaterialDesignIcons
        name={icon as 'plus'}
        size={18}
        color={accent ? colors.textOnPrimary : disabled ? colors.textFaint : colors.text}
      />
    </Pressable>
  );
}

export default function BinderScreen() {
  const { cards, loading: catalogLoading } = useCatalogCards();
  const { collection } = useCollection();
  const { getDisplayImageUri } = useImageRegion();
  const {
    binders,
    binder,
    loading,
    totalPages,
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
    setCover,
    setCoverBox,
    clearAll,
  } = useBinder();

  const { width } = useWindowDimensions();
  const narrow = width < breakpoints.compact;

  const [page, setPage] = useState(1);
  const [picking, setPicking] = useState<number | null>(null);
  /** Hueco levantado para moverlo: el siguiente toque decide dónde va. */
  const [moving, setMoving] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  /** Quitar la última página tampoco tiene deshacer si lleva cartas dentro. */
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  /** Aviso de portada o impresión; se limpia al reintentar. */
  const [notice, setNotice] = useState<string | null>(null);
  /** Recuadro en curso; `null` cuando no se está ajustando la portada. */
  const [draftBox, setDraftBox] = useState<CoverBox | null>(null);
  const draftBoxRef = useRef<CoverBox | null>(null);
  /** Medida real del marco: los desplazamientos se guardan en fracción de él. */
  const [coverFrame, setCoverFrame] = useState({ width: 1, height: 1 });
  const coverFrameRef = useRef(coverFrame);
  coverFrameRef.current = coverFrame;

  /** Posición de cada hueco dentro de la rejilla, para saber sobre cuál se suelta. */
  const slotRects = useRef<Record<number, { x: number; y: number; w: number; h: number }>>({});
  /** Origen del puntero; sin superar el umbral se trata como toque, no arrastre. */
  /** Esquina de la rejilla en pantalla: los huecos se guardan relativos a ella. */
  const [dragging, setDragging] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const dragPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Se leen dentro de los callbacks del gesto, donde el estado sería obsoleto.
  const dragRef = useRef<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  /** Suelta los oyentes del gesto en curso; null cuando no hay ninguno. */
  const releaseDrag = useRef<(() => void) | null>(null);
  /** Lo mismo para el ajuste de la portada. */
  const releaseBox = useRef<(() => void) | null>(null);

  // Salir de la pantalla a media arrastre no debe dejar oyentes en la ventana.
  useEffect(
    () => () => {
      releaseDrag.current?.();
      releaseBox.current?.();
    },
    []
  );

  /**
   * Arrastre en web. Los oyentes van en la ventana y no en la rejilla porque
   * el Pressable de cada hueco detiene la propagacion y el 'up' no llegaba.
   */
  const startPointerDrag = (index: number, x0: number, y0: number) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    // Un gesto anterior mal terminado se cierra antes de abrir otro: si no, se
    // acumulan pares de oyentes y un solo 'up' dispara varios intercambios.
    releaseDrag.current?.();

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (dragRef.current === null) {
        // Umbral: por debajo es un toque y no debe robar el clic.
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        dragRef.current = index;
        setDragging(index);
        setMoving(null);
      }
      const over = slotFromPoint(ev.clientX, ev.clientY);
      hoverRef.current = over;
      setHovered(over);
      dragPos.setValue({ x: dx, y: dy });
    };
    /** Devuelve todo a reposo, con o sin intercambio. */
    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      releaseDrag.current = null;
      dragRef.current = null;
      hoverRef.current = null;
      dragPos.setValue({ x: 0, y: 0 });
      setDragging(null);
      setHovered(null);
    };

    const onUp = (ev: PointerEvent) => {
      const from = dragRef.current;
      const to = slotFromPoint(ev.clientX, ev.clientY) ?? hoverRef.current;
      finish();
      if (from != null && to != null && from !== to) swapSlots(from, to);
    };

    /**
     * El navegador se queda el gesto —un scroll táctil que arranca sobre una
     * carta— y entonces no llega ningún 'up'. Sin esto los oyentes quedaban
     * colgados y el siguiente toque intercambiaba con el origen viejo.
     */
    const onCancel = () => finish();

    releaseDrag.current = finish;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  /** Hueco bajo un punto de la pantalla. Solo web: usa el DOM directamente. */
  const slotFromPoint = (x: number, y: number): number | null => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el) {
      const value = el.dataset?.slot;
      if (value !== undefined) return Number(value);
      el = el.parentElement;
    }
    return null;
  };

  /** Copias ya colocadas por carta, para atenuarlas en el selector. */
  const placedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of binder?.slots ?? []) {
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [binder?.slots]);

  // Buscar por id en 5111 cartas por cada hueco sería lineal: se indexa una vez.
  const byId = useMemo(() => {
    const map = new Map<string, (typeof cards)[number]>();
    for (const card of cards) map.set(card.id, card);
    return map;
  }, [cards]);

  const grid = gridOf(binder?.gridSize ?? '3x3');

  // La aritmetica vive en `responsiveLayout` para poder comprobarla sobre un
  // barrido de anchos con `npm run check:responsive`.
  const { spread, sheets, pageWidth, slotWidth, slotHeight } = getBinderBoard(width, grid.cols);

  /**
   * La hoja 0 es la portada y las demás son las páginas: así la portada se pasa
   * como una hoja más en vez de vivir fuera del archivador.
   */
  const lastSheet = totalPages;
  const clamped = Math.min(Math.max(page, 0), lastSheet);
  // En pliego la izquierda es siempre par: al pasar hoja avanzan las dos.
  const leftSheet = spread ? clamped - (clamped % 2) : clamped;
  const rightSheet = leftSheet + 1;
  const step = spread ? 2 : 1;
  const atStart = leftSheet <= 0;
  const atEnd = leftSheet + sheets - 1 >= lastSheet;
  const sheetName = (index: number) => (index === 0 ? 'Portada' : String(index));
  const pageLabel =
    spread && rightSheet <= lastSheet
      ? `${sheetName(leftSheet)} · ${sheetName(rightSheet)}`
      : sheetName(leftSheet);
  const filled = binder ? binder.slots.filter(Boolean).length : 0;
  /** Cartas en la última página: lo que se perdería al quitarla. */
  const lastPageFilled = binder
    ? pageSlots(totalPages).filter((index) => binder.slots[index]).length
    : 0;

  // Las confirmaciones se desarman al cambiar de binder o de número de páginas:
  // un botón que sigue cebado desde hace rato borra sin que se espere.
  useEffect(() => {
    setConfirmingClear(false);
    setConfirmingRemove(false);
  }, [binder?.id, totalPages]);

  const chooseCover = async () => {
    setNotice(null);
    try {
      const picked = await pickCoverImage();
      if (picked) {
        setCover(picked.uri, picked.aspect);
        setDraftBox(null);
      } else if (Platform.OS !== 'web') {
        setNotice('Subir portada solo está disponible en la versión web por ahora.');
      }
    } catch {
      setNotice('No se pudo leer esa imagen. Prueba con otra.');
    }
  };

  const frameAspect = coverFrame.width / coverFrame.height;
  const imageAspect = binder?.coverAspect ?? frameAspect;
  const savedBox = binder?.coverBox ?? coverFillBox(imageAspect, frameAspect);
  const shownBox = draftBox ?? savedBox;

  /** Lado mínimo: por debajo el recuadro sería imposible de agarrar. */
  const MIN_SIDE = 0.08;

  const clampBox = (box: CoverBox): CoverBox => ({
    left: Math.min(1.5, Math.max(-1.5, box.left)),
    top: Math.min(1.5, Math.max(-1.5, box.top)),
    width: Math.min(6, Math.max(MIN_SIDE, box.width)),
    height: Math.min(6, Math.max(MIN_SIDE, box.height)),
  });

  const updateDraft = (next: CoverBox) => {
    const clamped = clampBox(next);
    draftBoxRef.current = clamped;
    setDraftBox(clamped);
  };

  /** Qué borde se está arrastrando; `move` desplaza la foto entera. */
  type Grip = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

  /**
   * Arrastre del recuadro, como una imagen en Word: el centro la mueve y cada
   * tirador estira por su lado. Los oyentes van en la ventana para no
   * depender de que el puntero siga encima del tirador.
   */
  const startBoxDrag = (grip: Grip, x0: number, y0: number) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    releaseBox.current?.();
    const start = draftBoxRef.current ?? savedBox;
    const frame = coverFrameRef.current;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / frame.width;
      const dy = (ev.clientY - y0) / frame.height;
      const next = { ...start };

      if (grip === 'move') {
        next.left = start.left + dx;
        next.top = start.top + dy;
      } else {
        if (grip.includes('w')) {
          next.left = start.left + dx;
          next.width = start.width - dx;
        }
        if (grip.includes('e')) next.width = start.width + dx;
        if (grip.includes('n')) {
          next.top = start.top + dy;
          next.height = start.height - dy;
        }
        if (grip.includes('s')) next.height = start.height + dy;
        // Al encoger por la izquierda o por arriba, el borde opuesto manda:
        // sin esto el recuadro se escaparía al pasarse del mínimo.
        if (next.width < MIN_SIDE && grip.includes('w')) {
          next.left = start.left + start.width - MIN_SIDE;
        }
        if (next.height < MIN_SIDE && grip.includes('n')) {
          next.top = start.top + start.height - MIN_SIDE;
        }
      }
      updateDraft(next);
    };

    // 'pointercancel' cuenta igual que soltar: el navegador puede quedarse el
    // gesto y entonces no llega ningún 'up'.
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      releaseBox.current = null;
    };

    releaseBox.current = onUp;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  /** Manda al papel lo que hay colocado, una hoja del binder por página. */
  const handlePrint = () => {
    if (!binder) return;
    setNotice(null);
    const pages = Array.from({ length: totalPages }, (_, i) =>
      pageSlots(i + 1).map((index): PrintableSlot | null => {
        const id = binder.slots[index];
        const card = id ? byId.get(id) : undefined;
        const uri = card ? getDisplayImageUri(card) : undefined;
        if (!card || !uri) return null;
        return { code: card.id, name: card.name, uri };
      })
    );

    const result = printBinder({
      title: binder.title,
      cols: grid.cols,
      rows: grid.rows,
      pages,
      cover: binder.cover,
      coverLayout: binder.cover ? { aspect: frameAspect, ...savedBox } : null,
    });
    if (result === 'unsupported') {
      setNotice('Imprimir solo está disponible en la versión web por ahora.');
    }
  };

  /** Alto de una hoja, para que la portada case con la rejilla de al lado. */
  const sheetHeight =
    grid.rows * slotHeight + (grid.rows - 1) * spacing.sm + spacing.sm * 2 + 18;

  /**
   * La portada: primera hoja del binder. Sin foto queda el hueco para ponerla,
   * que es donde se busca.
   */
  /** Los ocho tiradores, con su posición dentro del recuadro. */
  const GRIPS: { grip: Grip; label: string; x: number; y: number }[] = [
    { grip: 'nw', label: 'Esquina superior izquierda', x: 0, y: 0 },
    { grip: 'n', label: 'Borde superior', x: 0.5, y: 0 },
    { grip: 'ne', label: 'Esquina superior derecha', x: 1, y: 0 },
    { grip: 'e', label: 'Borde derecho', x: 1, y: 0.5 },
    { grip: 'se', label: 'Esquina inferior derecha', x: 1, y: 1 },
    { grip: 's', label: 'Borde inferior', x: 0.5, y: 1 },
    { grip: 'sw', label: 'Esquina inferior izquierda', x: 0, y: 1 },
    { grip: 'w', label: 'Borde izquierdo', x: 0, y: 0.5 },
  ];

  const renderCover = () => {
    const adjusting = draftBox !== null;
    const box = {
      left: shownBox.left * coverFrame.width,
      top: shownBox.top * coverFrame.height,
      width: shownBox.width * coverFrame.width,
      height: shownBox.height * coverFrame.height,
    };

    return (
      <View key="cover" style={[styles.page, { width: pageWidth, minHeight: sheetHeight }]}>
        <View
          style={styles.coverSheet}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setCoverFrame({ width: Math.max(1, w), height: Math.max(1, h) });
          }}
        >
          {binder?.cover ? (
            <View
              style={{ position: 'absolute', ...box }}
              onPointerDown={(e) => {
                if (!adjusting) return;
                startBoxDrag('move', e.nativeEvent.clientX, e.nativeEvent.clientY);
              }}
            >
              <Image
                source={binder.cover}
                style={styles.coverFill}
                contentFit="fill"
                recyclingKey={`cover-${binder.id}`}
              />
            </View>
          ) : null}

          {/* Contorno y tiradores: el marco de selección, como en Word. */}
          {adjusting ? <View style={[styles.selection, box]} pointerEvents="none" /> : null}
          {adjusting
            ? GRIPS.map((g) => {
                // Si la foto desborda la hoja, su tirador se queda pegado al
                // borde: fuera del recorte no habría forma de agarrarlo.
                const inset = GRIP_SIZE / 2 + 2;
                const x = Math.min(
                  coverFrame.width - inset,
                  Math.max(inset, box.left + g.x * box.width)
                );
                const y = Math.min(
                  coverFrame.height - inset,
                  Math.max(inset, box.top + g.y * box.height)
                );
                return (
                  <View
                    key={g.grip}
                    accessibilityRole="button"
                    accessibilityLabel={g.label}
                    onPointerDown={(e) =>
                      startBoxDrag(g.grip, e.nativeEvent.clientX, e.nativeEvent.clientY)
                    }
                    style={[
                      styles.grip,
                      { left: x - GRIP_SIZE / 2, top: y - GRIP_SIZE / 2, cursor: GRIP_CURSOR[g.grip] } as object,
                    ]}
                  />
                );
              })
            : null}

          {adjusting ? (
            <View style={styles.fitBar} pointerEvents="box-none">
              <Text style={styles.fitHint}>
                Arrastra la foto para moverla, o los tiradores para estirarla
              </Text>
              <View style={styles.fitRow}>
                <PirateButton
                  label="Rellenar hoja"
                  variant="ghost"
                  onPress={() => updateDraft(coverFillBox(imageAspect, frameAspect))}
                />
                <PirateButton
                  label="Foto entera"
                  variant="ghost"
                  onPress={() => updateDraft(coverContainBox(imageAspect, frameAspect))}
                />
              </View>
              <View style={styles.fitRow}>
                <PirateButton
                  label="Listo"
                  variant="primary"
                  onPress={() => {
                    setCoverBox(clampBox(shownBox));
                    draftBoxRef.current = null;
                    setDraftBox(null);
                  }}
                />
                <PirateButton
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    draftBoxRef.current = null;
                    setDraftBox(null);
                  }}
                />
              </View>
            </View>
          ) : binder?.cover ? (
            /* Con foto puesta la hoja se deja ver: solo iconos discretos. */
            <View style={styles.coverTools}>
              <NavIcon
                icon="crop"
                label="Ajustar portada"
                onPress={() => updateDraft(savedBox)}
              />
              <NavIcon
                icon="image-refresh-outline"
                label="Cambiar foto de portada"
                onPress={() => {
                  void chooseCover();
                }}
              />
              <NavIcon
                icon="trash-can-outline"
                label="Quitar portada"
                onPress={() => setCover(null)}
              />
            </View>
          ) : (
            <View style={styles.coverPlate}>
              <Text style={styles.coverTitle} numberOfLines={3}>
                {binder?.title}
              </Text>
              {binder?.description ? (
                <Text style={styles.coverDescription} numberOfLines={3}>
                  {binder.description}
                </Text>
              ) : null}
              <PirateButton
                label="Subir foto"
                variant="primary"
                onPress={() => {
                  void chooseCover();
                }}
              />
            </View>
          )}
        </View>
        <Text style={styles.pageNumber}>Portada</Text>
      </View>
    );
  };

  /**
   * Una hoja del archivador. Más allá de la última se ofrece crearla ahí
   * mismo: es donde el usuario mira cuando se queda sin sitio.
   */
  const renderPage = (pageNumber: number) => {
    if (pageNumber > totalPages) {
      return (
        <Pressable
          key={`add-${pageNumber}`}
          onPress={addPage}
          accessibilityRole="button"
          accessibilityLabel="Añadir página"
          style={({ pressed }) => [
            styles.page,
            styles.pageGhost,
            { width: pageWidth },
            pressed && styles.slotPressed,
          ]}
        >
          <MaterialDesignIcons name="plus" size={28} color={colors.textFaint} />
          <Text style={styles.pageGhostText}>Añadir página</Text>
        </Pressable>
      );
    }

    const indices = pageSlots(pageNumber);
    const carrying = dragging !== null && indices.includes(dragging) ? dragging : null;

    return (
      <View key={pageNumber} style={[styles.page, { width: pageWidth }]}>
        <View style={[styles.grid, { maxWidth: grid.cols * (slotWidth + spacing.sm) }]}>
          {indices.map((index) => {
            const cardId = binder?.slots[index] ?? null;
            const card = cardId ? byId.get(cardId) : undefined;
            const uri = card ? getDisplayImageUri(card) : undefined;

            return (
              <View
                key={index}
                {...({ dataSet: { slot: String(index) } } as object)}
                onPointerDown={(e) => {
                  if (!cardId) return;
                  startPointerDrag(index, e.nativeEvent.clientX, e.nativeEvent.clientY);
                }}
                onLayout={(e) => {
                  const { x, y, width: w, height: h } = e.nativeEvent.layout;
                  slotRects.current[index] = { x, y, w, h };
                }}
                style={{ width: slotWidth, height: slotHeight }}
              >
                <Pressable
                  onPress={() => {
                    // Con una carta levantada, el toque coloca en vez de abrir.
                    if (moving !== null) {
                      if (moving !== index) swapSlots(moving, index);
                      setMoving(null);
                      return;
                    }
                    if (cardId) setMoving(index);
                    else setPicking(index);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    card
                      ? moving === index
                        ? `${card.name}. Levantada, elige destino`
                        : `${card.name}. Toca para moverla`
                      : moving !== null
                        ? 'Hueco vacío. Toca para soltar aquí'
                        : 'Hueco vacío'
                  }
                  style={({ pressed }) => [
                    styles.slot,
                    styles.slotFill,
                    !card && styles.slotEmpty,
                    moving === index && styles.slotMoving,
                    moving !== null && moving !== index && styles.slotTarget,
                    dragging === index && styles.slotDragging,
                    hovered === index && dragging !== index && styles.slotHovered,
                    pressed && styles.slotPressed,
                  ]}
                >
                  {card && uri ? (
                    <CardImage
                      uri={uri}
                      fallbackUri={card.images?.small}
                      width={slotWidth}
                      height={slotHeight}
                      priority="low"
                      recyclingKey={card.id}
                    />
                  ) : (
                    <Text style={styles.slotPlus}>+</Text>
                  )}
                </Pressable>

                {/* Sacarla del binder desde la propia carta, sin buscar botón. */}
                {moving === index && card ? (
                  <Pressable
                    onPress={() => {
                      setCard(index, null);
                      setMoving(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${card.name} del binder`}
                    style={({ pressed }) => [styles.slotRemove, pressed && styles.slotPressed]}
                  >
                    <MaterialDesignIcons name="close" size={13} color={colors.textOnPrimary} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {/* Carta flotante: sigue al dedo sin sacar el hueco de la rejilla. */}
          {carrying !== null && slotRects.current[carrying] ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ghost,
                {
                  width: slotWidth,
                  height: slotHeight,
                  left: slotRects.current[carrying].x,
                  top: slotRects.current[carrying].y,
                  transform: dragPos.getTranslateTransform(),
                },
              ]}
            >
              {(() => {
                const id = binder?.slots[carrying];
                const c = id ? byId.get(id) : undefined;
                const u = c ? getDisplayImageUri(c) : undefined;
                return c && u ? (
                  <CardImage
                    uri={u}
                    fallbackUri={c.images?.small}
                    width={slotWidth}
                    height={slotHeight}
                    recyclingKey={`ghost-${c.id}`}
                  />
                ) : null;
              })()}
            </Animated.View>
          ) : null}
        </View>

        <Text style={styles.pageNumber}>{pageNumber}</Text>
      </View>
    );
  };

  if (catalogLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.goldInk} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {!binder ? (
          <BinderLibrary
            binders={binders}
            onOpen={(id) => {
              openBinder(id);
              setPage(1);
            }}
            onCreate={(title, description) => {
              createBinder(title, description);
              setPage(1);
            }}
            onRename={renameBinder}
            onDuplicate={duplicateBinder}
            onDelete={deleteBinder}
          />
        ) : (
          <>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => openBinder(null)}
            accessibilityRole="button"
            accessibilityLabel="Volver a mis binders"
            style={({ pressed }) => [styles.backButton, pressed && styles.slotPressed]}
          >
            <MaterialDesignIcons name="chevron-left" size={20} color={colors.text} />
            <Text style={styles.backText}>Mis binders</Text>
          </Pressable>
          <Text style={styles.heading} numberOfLines={1}>
            {binder.title}
          </Text>
        </View>

        <View style={[styles.layout, narrow && styles.layoutStacked]}>
        <Panel crowned style={[styles.board, !narrow && styles.boardWide]}>
          <View style={styles.toolbar}>
            <NavIcon icon="chevron-double-left" label="Primera hoja" disabled={atStart} onPress={() => setPage(0)} />
            <NavIcon icon="chevron-left" label="Hoja anterior" disabled={atStart} onPress={() => setPage(Math.max(0, leftSheet - step))} />
            <View style={styles.counter}>
              <Text style={styles.counterPage}>{pageLabel}</Text>
              <Text style={styles.counterTotal}>/ {totalPages}</Text>
            </View>
            <NavIcon icon="chevron-right" label="Hoja siguiente" disabled={atEnd} onPress={() => setPage(Math.min(lastSheet, leftSheet + step))} />
            <NavIcon icon="chevron-double-right" label="Última hoja" disabled={atEnd} onPress={() => setPage(lastSheet)} />
            <View style={styles.toolbarSpacer} />
            <Text style={styles.toolbarMeta}>{filled} cartas</Text>
            <NavIcon icon="plus" label="Añadir página" accent onPress={addPage} />
          </View>

          <View style={styles.spread}>
            {Array.from({ length: sheets }, (_, i) => {
              const index = leftSheet + i;
              return index === 0 ? renderCover() : renderPage(index);
            })}
          </View>

          <Text style={styles.hint}>
            {moving !== null
              ? 'Toca otro hueco para intercambiar, o usa los botones de abajo.'
              : 'Arrastra una carta para recolocarla, incluso a la otra hoja.'}
          </Text>

          {moving !== null ? (
            <View style={styles.movingBar}>
              <PirateButton
                label="Cambiar carta"
                variant="primary"
                onPress={() => {
                  // Se vacía antes: el relleno salta los huecos ocupados, así
                  // que sin esto la nueva carta caería en el siguiente libre.
                  setCard(moving, null);
                  setPicking(moving);
                  setMoving(null);
                }}
              />
              <PirateButton label="Cancelar" variant="ghost" onPress={() => setMoving(null)} />
            </View>
          ) : null}
        </Panel>

        <Panel style={[styles.settings, !narrow && styles.settingsColumn]}>
          <SectionHeading title="Rejilla" meta={`${grid.cols}×${grid.rows}`} />
          <View style={styles.chips}>
            {GRID_SIZES.map((size) => {
              const active = size.id === binder.gridSize;
              return (
                <Pressable
                  key={size.id}
                  onPress={() => setGridSize(size.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {size.cols}×{size.rows}
                  </Text>
                  <Text style={[styles.chipHint, active && styles.chipTextActive]}>
                    {size.cols * size.rows} cartas
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Añadir vive en la barra de páginas; aquí solo queda lo destructivo. */}
          <PirateButton
            label={
              confirmingRemove
                ? `Confirmar: perder ${lastPageFilled} carta${lastPageFilled === 1 ? '' : 's'}`
                : 'Quitar última página'
            }
            variant={confirmingRemove ? 'primary' : 'ghost'}
            disabled={totalPages <= 1}
            onPress={() => {
              // Vacía se quita sin más; con cartas dentro se pregunta, porque
              // no hay deshacer.
              if (lastPageFilled > 0 && !confirmingRemove) {
                setConfirmingRemove(true);
                return;
              }
              removeLastPage();
              setConfirmingRemove(false);
            }}
          />

          <SectionHeading title="Imprimir" meta={`${totalPages} ${totalPages === 1 ? 'hoja' : 'hojas'}`} />
          <PirateButton label="Imprimir binder" variant="primary" onPress={handlePrint} />

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <PirateButton
            label={confirmingClear ? `Confirmar: vaciar ${filled} cartas` : 'Vaciar binder'}
            variant={confirmingClear ? 'primary' : 'ghost'}
            onPress={() => {
              // Dos toques: vaciar no tiene deshacer.
              if (!confirmingClear) {
                setConfirmingClear(true);
                return;
              }
              clearAll();
              setPage(1);
              setConfirmingClear(false);
            }}
          />
        </Panel>
        </View>
          </>
        )}
      </ScrollView>

      <CardPickerModal
        visible={picking !== null}
        cards={cards}
        ownedIds={collection}
        inBinder={placedCounts}
        onAdd={(ids) => {
          if (picking !== null) fillFrom(picking, ids);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  /** En ancho los ajustes van a la derecha, no debajo del álbum. */
  layout: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  layoutStacked: { flexDirection: 'column' },
  boardWide: { flex: 1, minWidth: 0 },
  settingsColumn: { width: 260 },
  heading: { ...typography.display, color: colors.goldInk, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  backText: { ...typography.label, color: colors.text },
  /** La hoja de portada ocupa todo el alto de la rejilla de al lado. */
  coverSheet: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.borderGold,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  coverFill: { width: '100%', height: '100%' },
  /** Marco de selección: el contorno de lo que se está ajustando. */
  selection: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  grip: {
    position: 'absolute',
    width: GRIP_SIZE,
    height: GRIP_SIZE,
    borderRadius: 3,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  /** Iconos de la portada ya puesta: no deben tapar la foto. */
  coverTools: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 252, 240, 0.88)',
  },
  /** Solo se ve cuando no hay foto: es la invitación a ponerla. */
  coverPlate: { alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  coverTitle: {
    ...typography.title,
    color: colors.goldInk,
    textAlign: 'center',
  },
  coverDescription: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  /** Controles del encuadre: van al pie para no tapar lo que se está colocando. */
  fitBar: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: 'rgba(255, 252, 240, 0.94)',
  },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  fitHint: { ...typography.caption, color: colors.textMuted },
  notice: { ...typography.caption, color: colors.error },
  board: { gap: spacing.sm, alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    position: 'relative',
  },
  ghost: {
    position: 'absolute',
    borderRadius: radii.sm,
    overflow: 'hidden',
    zIndex: 20,
    opacity: 0.95,
  },
  slotFill: { width: '100%', height: '100%' },
  slot: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  slotPressed: { opacity: 0.7 },
  /** Carta levantada, esperando destino. */
  slotMoving: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  /** Origen del arrastre: se atenúa para que se vea que viaja. */
  slotDragging: { opacity: 0.35 },
  /** Hueco sobre el que se soltaría ahora mismo. */
  slotHovered: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  /** Destino posible mientras se mueve. */
  slotTarget: {
    borderWidth: 2,
    borderColor: colors.borderGold,
    borderStyle: 'dashed',
  },
  /** Aspa de la carta levantada: arriba a la derecha, como en la referencia. */
  slotRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 5,
  },
  movingBar: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  slotPlus: { color: colors.textFaint, fontSize: 26, fontWeight: '300' },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
    flexWrap: 'wrap',
  },
  toolbarSpacer: { flex: 1, minWidth: spacing.sm },
  toolbarMeta: { ...typography.caption, color: colors.textMuted },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  navIconAccent: { backgroundColor: colors.primary, borderColor: colors.primary },
  navIconOff: { opacity: 0.4 },
  counter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  counterPage: { ...typography.label, color: colors.text, fontWeight: '900' },
  counterTotal: { ...typography.caption, color: colors.textMuted },
  /** Las dos hojas abiertas, con su canal central. */
  spread: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  page: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageGhost: { borderStyle: 'dashed', justifyContent: 'center', minHeight: 220 },
  pageGhostText: { ...typography.caption, color: colors.textFaint },
  pageNumber: { ...typography.caption, color: colors.textFaint },
  settings: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.text },
  chipHint: { ...typography.caption, color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
});
