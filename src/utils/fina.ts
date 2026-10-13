import { PoolLength, SwimEventId, SwimmerGender } from '../types';

export const FINA_TABLE_VERSION = 'World Aquatics 2025/2026';

type BaseTimeTable = Record<PoolLength, Partial<Record<SwimEventId, number>>>;

/**
 * Tiempos Base oficiales de World Aquatics (FINA) en segundos para Pileta Corta (25m SCM)
 * y Pileta Larga (50m LCM), ramas Masculina y Femenina.
 */
export const FINA_BASE_TIMES: Record<SwimmerGender, BaseTimeTable> = {
  male: {
    25: {
      '50-free': 19.9,
      '100-free': 44.84,
      '200-free': 98.61,
      '400-free': 212.25,
      '800-free': 440.46,
      '1500-free': 846.88,
      '50-back': 22.11,
      '100-back': 48.33,
      '200-back': 105.63,
      '50-breast': 24.95,
      '100-breast': 55.28,
      '200-breast': 120.16,
      '50-fly': 21.32,
      '100-fly': 47.71,
      '200-fly': 106.85,
      '100-medley': 49.28,
      '200-medley': 108.88,
      '400-medley': 234.81,
    },
    50: {
      '50-free': 20.91,
      '100-free': 46.4,
      '200-free': 102.0,
      '400-free': 220.07,
      '800-free': 452.12,
      '1500-free': 870.67,
      '50-back': 23.55,
      '100-back': 51.6,
      '200-back': 111.92,
      '50-breast': 25.95,
      '100-breast': 56.88,
      '200-breast': 125.48,
      '50-fly': 22.27,
      '100-fly': 49.45,
      '200-fly': 110.34,
      // 100m Combinado es exclusivo de pileta corta (25m), se provee fallback proporcional si se consulta
      '100-medley': 51.0,
      '200-medley': 114.0,
      '400-medley': 242.5,
    },
  },
  female: {
    25: {
      '50-free': 22.83,
      '100-free': 50.25,
      '200-free': 110.31,
      '400-free': 230.25,
      '800-free': 477.42,
      '1500-free': 908.24,
      '50-back': 25.23,
      '100-back': 54.02,
      '200-back': 118.04,
      '50-breast': 28.37,
      '100-breast': 62.36,
      '200-breast': 132.5,
      '50-fly': 23.94,
      '100-fly': 52.71,
      '200-fly': 119.32,
      '100-medley': 55.11,
      '200-medley': 121.63,
      '400-medley': 255.48,
    },
    50: {
      '50-free': 23.61,
      '100-free': 51.71,
      '200-free': 112.23,
      '400-free': 235.38,
      '800-free': 484.79,
      '1500-free': 920.48,
      '50-back': 26.86,
      '100-back': 57.13,
      '200-back': 123.14,
      '50-breast': 29.16,
      '100-breast': 64.13,
      '200-breast': 137.55,
      '50-fly': 24.43,
      '100-fly': 55.18,
      '200-fly': 121.81,
      '100-medley': 57.0,
      '200-medley': 126.12,
      '400-medley': 264.38,
    },
  },
};

export function getFinaBaseTime(
  eventId: SwimEventId,
  poolLength: PoolLength,
  gender: SwimmerGender
): number | null {
  const base = FINA_BASE_TIMES[gender]?.[poolLength]?.[eventId];
  return typeof base === 'number' && base > 0 ? base : null;
}

/**
 * Calcula los Puntos FINA (World Aquatics) oficiales según la fórmula:
 * P = floor(1000 * (B / T)^3)
 */
export function calculateFinaPoints(
  timeSec: number,
  eventId: SwimEventId,
  poolLength: PoolLength,
  gender: SwimmerGender
): number {
  if (!Number.isFinite(timeSec) || timeSec <= 0) {
    return 0;
  }
  const baseTime = getFinaBaseTime(eventId, poolLength, gender);
  if (!baseTime) {
    return 0;
  }
  const ratio = baseTime / timeSec;
  const points = Math.floor(1000 * Math.pow(ratio, 3));
  return Math.max(0, points);
}

/**
 * Calcula el tiempo necesario (en segundos, redondeado a centésimas) para alcanzar
 * una cantidad determinada de Puntos FINA.
 */
export function calculateTimeForFinaPoints(
  points: number,
  eventId: SwimEventId,
  poolLength: PoolLength,
  gender: SwimmerGender
): number | null {
  if (!Number.isFinite(points) || points <= 0) {
    return null;
  }
  const baseTime = getFinaBaseTime(eventId, poolLength, gender);
  if (!baseTime) {
    return null;
  }
  const timeSec = baseTime / Math.cbrt(points / 1000);
  return Math.round(timeSec * 100) / 100;
}

