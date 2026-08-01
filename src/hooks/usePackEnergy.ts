import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyRecharge,
  loadEnergy,
  saveEnergy,
  MAX_FREE_CHARGES,
  type PackEnergyState,
} from '../storage/packEnergy';

export interface SpendResult {
  ok: boolean;
  /** Cuántas cargas gratis y cuántos tokens extra se consumieron. */
  usedFree: number;
  usedExtra: number;
}

export function usePackEnergy() {
  const [state, setState] = useState<PackEnergyState | null>(null);
  const [secondsToNext, setSecondsToNext] = useState(0);
  const [progressToNext, setProgressToNext] = useState(1);
  // Evita reescribir AsyncStorage en cada tick del contador.
  const persisted = useRef<PackEnergyState | null>(null);

  const commit = useCallback((next: PackEnergyState, persist: boolean) => {
    persisted.current = next;
    setState(next);
    if (persist) void saveEnergy(next);
  }, []);

  useEffect(() => {
    let active = true;
    void loadEnergy().then((loaded) => {
      if (!active) return;
      const view = applyRecharge(loaded);
      commit(
        { ...loaded, freeCharges: view.freeCharges, rechargeAnchor: view.rechargeAnchor },
        view.freeCharges !== loaded.freeCharges
      );
      setSecondsToNext(view.secondsToNext);
      setProgressToNext(view.progressToNext);
    });
    return () => {
      active = false;
    };
  }, [commit]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = persisted.current;
      if (!current) return;
      const view = applyRecharge(current);
      setSecondsToNext(view.secondsToNext);
      setProgressToNext(view.progressToNext);
      if (view.freeCharges !== current.freeCharges) {
        commit(
          { ...current, freeCharges: view.freeCharges, rechargeAnchor: view.rechargeAnchor },
          true
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [commit]);

  /** Gasta cargas gratis primero y completa con tokens extra. */
  const spend = useCallback(
    (amount: number): SpendResult => {
      const current = persisted.current;
      if (!current) return { ok: false, usedFree: 0, usedExtra: 0 };

      const total = current.freeCharges + current.extraTokens;
      if (total < amount) return { ok: false, usedFree: 0, usedExtra: 0 };

      const usedFree = Math.min(current.freeCharges, amount);
      const usedExtra = amount - usedFree;
      const wasFull = current.freeCharges >= MAX_FREE_CHARGES;

      commit(
        {
          ...current,
          freeCharges: current.freeCharges - usedFree,
          extraTokens: current.extraTokens - usedExtra,
          // Al bajar del máximo arranca el reloj de recarga.
          rechargeAnchor: wasFull && usedFree > 0
            ? new Date().toISOString()
            : current.rechargeAnchor,
        },
        true
      );

      return { ok: true, usedFree, usedExtra };
    },
    [commit]
  );

  /** Registra el resultado de un sobre: total abierto y contador de pity. */
  const recordOpening = useCallback(
    (packId: string, packsSinceChase: number, packCount = 1) => {
      const current = persisted.current;
      if (!current) return;
      commit(
        {
          ...current,
          packsOpened: {
            ...current.packsOpened,
            [packId]: (current.packsOpened[packId] ?? 0) + packCount,
          },
          packsSinceChase: { ...current.packsSinceChase, [packId]: packsSinceChase },
        },
        true
      );
    },
    [commit]
  );

  const totalCharges = state ? state.freeCharges + state.extraTokens : 0;

  return {
    state,
    loading: state === null,
    freeCharges: state?.freeCharges ?? 0,
    extraTokens: state?.extraTokens ?? 0,
    totalCharges,
    secondsToNext,
    progressToNext,
    spend,
    recordOpening,
  };
}
