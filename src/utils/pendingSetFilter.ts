/** Set pendiente al abrir el catálogo desde la pestaña Sets (sin persistir en URL). */
let pending: string | null = null;

export function queueSetFilter(setName: string) {
  pending = setName;
}

export function takeSetFilter(): string | null {
  const value = pending;
  pending = null;
  return value;
}
