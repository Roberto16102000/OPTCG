import AsyncStorage from '@react-native-async-storage/async-storage';

const ENERGY_KEY = '@onepiece/pack_energy';

/** Cargas gratis simultáneas. */
export const MAX_FREE_CHARGES = 5;

/** 4 h 48 min por carga: 5 cargas completas al día. */
export const RECHARGE_SECONDS = 17280;

/** Sobres extra de bienvenida. */
const STARTING_EXTRA_TOKENS = 3;

export interface PackEnergyState {
  freeCharges: number;
  extraTokens: number;
  /** ISO del momento en que empezó a recargarse la carga en curso. */
  rechargeAnchor: string;
  /** Sobres abiertos por set, para estadísticas. */
  packsOpened: Record<string, number>;
  /** Sobres sin chase por set, para el pity. */
  packsSinceChase: Record<string, number>;
}

export function createInitialEnergy(now: number = Date.now()): PackEnergyState {
  return {
    freeCharges: MAX_FREE_CHARGES,
    extraTokens: STARTING_EXTRA_TOKENS,
    rechargeAnchor: new Date(now).toISOString(),
    packsOpened: {},
    packsSinceChase: {},
  };
}

export interface RechargeView {
  freeCharges: number;
  rechargeAnchor: string;
  /** Segundos hasta la siguiente carga; 0 si ya está al máximo. */
  secondsToNext: number;
  /** 0..1 de progreso hacia la siguiente carga. */
  progressToNext: number;
}

/**
 * Recalcula las cargas acumuladas desde el ancla. Es una función pura para que
 * el mismo cálculo sirva al montar la app y en el tick del contador.
 */
export function applyRecharge(state: PackEnergyState, now: number = Date.now()): RechargeView {
  const anchor = Date.parse(state.rechargeAnchor);
  const rechargeMs = RECHARGE_SECONDS * 1000;

  if (state.freeCharges >= MAX_FREE_CHARGES || Number.isNaN(anchor)) {
    return {
      freeCharges: Math.min(state.freeCharges, MAX_FREE_CHARGES),
      rechargeAnchor: new Date(now).toISOString(),
      secondsToNext: 0,
      progressToNext: 1,
    };
  }

  const elapsed = Math.max(0, now - anchor);
  const earned = Math.floor(elapsed / rechargeMs);
  const freeCharges = Math.min(MAX_FREE_CHARGES, state.freeCharges + earned);

  if (freeCharges >= MAX_FREE_CHARGES) {
    return {
      freeCharges,
      rechargeAnchor: new Date(now).toISOString(),
      secondsToNext: 0,
      progressToNext: 1,
    };
  }

  // Conserva el resto para no regalar tiempo en cada recarga.
  const remainder = elapsed - earned * rechargeMs;
  return {
    freeCharges,
    rechargeAnchor: new Date(now - remainder).toISOString(),
    secondsToNext: Math.ceil((rechargeMs - remainder) / 1000),
    progressToNext: remainder / rechargeMs,
  };
}

export async function loadEnergy(): Promise<PackEnergyState> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  if (!raw) {
    const initial = createInitialEnergy();
    await saveEnergy(initial);
    return initial;
  }
  const parsed = JSON.parse(raw) as Partial<PackEnergyState>;
  return {
    ...createInitialEnergy(),
    ...parsed,
    packsOpened: parsed.packsOpened ?? {},
    packsSinceChase: parsed.packsSinceChase ?? {},
  };
}

export async function saveEnergy(state: PackEnergyState): Promise<void> {
  await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
}

/** mm:ss o h:mm:ss según la magnitud. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}
