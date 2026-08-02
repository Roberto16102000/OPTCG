import { createContext, useContext, type ReactNode } from 'react';

/**
 * Los filtros deciden su disposición por el ancho de ventana, que en la columna
 * lateral es engañoso: la ventana mide 1280 pero la columna solo 264, así que
 * se colocaban en línea y se salían. Este contexto les dice que están dentro de
 * un contenedor estrecho aunque la pantalla sea grande.
 */
const FilterLayoutContext = createContext<{ stacked: boolean }>({ stacked: false });

export function FilterLayoutProvider({
  stacked,
  children,
}: {
  stacked: boolean;
  children: ReactNode;
}) {
  return (
    <FilterLayoutContext.Provider value={{ stacked }}>{children}</FilterLayoutContext.Provider>
  );
}

export function useFilterLayout() {
  return useContext(FilterLayoutContext);
}
