/**
 * ¿Está este elemento cerca de la pantalla?
 *
 * Sirve para no descargar lo que nadie está mirando. Una página del catálogo
 * son 60 cartas, pero en un móvil caben seis; pedirlas todas eran 4,9 MB y
 * treinta y seis segundos con datos flojos.
 *
 * Una vez dice que sí, no vuelve atrás: si al salir de pantalla se descargara
 * la imagen, volver a subir la pediría otra vez y parpadearía.
 *
 * En nativo devuelve siempre `true`: allí `FlatList` ya desmonta lo que no se
 * ve, así que esto no pinta nada.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Cuánto se adelanta la carga por fuera de la pantalla.
 *
 * Con 600 px van entrando dos o tres filas antes de que lleguen, así que al
 * desplazarse normal la carta ya está. Subirlo más empieza a traer nada.
 */
const MARGEN = '600px';

export function useNearViewport<T>(): {
  ref: (nodo: T | null) => void;
  visible: boolean;
} {
  const soportado = Platform.OS === 'web' && typeof IntersectionObserver !== 'undefined';
  const [visible, setVisible] = useState(!soportado);
  const observador = useRef<IntersectionObserver | null>(null);
  const yaVisible = useRef(!soportado);

  useEffect(() => {
    return () => observador.current?.disconnect();
  }, []);

  const ref = (nodo: T | null) => {
    if (!soportado || yaVisible.current) return;
    observador.current?.disconnect();
    if (!nodo) return;

    // En react-native-web la referencia de un `View` ya es el nodo del DOM.
    const elemento = nodo as unknown as Element;
    if (!elemento || typeof (elemento as HTMLElement).getBoundingClientRect !== 'function') return;

    observador.current = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        yaVisible.current = true;
        setVisible(true);
        observador.current?.disconnect();
        observador.current = null;
      },
      { rootMargin: MARGEN }
    );
    observador.current.observe(elemento);
  };

  return { ref, visible };
}
