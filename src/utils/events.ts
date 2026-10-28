import {
  MarkContext,
  MarkModality,
  PoolLength,
  SplitGranularity,
  SwimDistance,
  SwimEvent,
  SwimEventId,
  SwimStroke,
  TimingMethod,
  WaterFeel,
} from '../types';

export const SWIM_EVENTS: SwimEvent[] = [
  // Mariposa
  {
    id: '50-fly',
    name: '50m Mariposa',
    shortName: '50 Mariposa',
    stroke: 'butterfly',
    strokeLabel: 'Mariposa',
    distance: 50,
    poolLengths: [25, 50],
  },
  {
    id: '100-fly',
    name: '100m Mariposa',
    shortName: '100 Mariposa',
    stroke: 'butterfly',
    strokeLabel: 'Mariposa',
    distance: 100,
    poolLengths: [25, 50],
  },
  {
    id: '200-fly',
    name: '200m Mariposa',
    shortName: '200 Mariposa',
    stroke: 'butterfly',
    strokeLabel: 'Mariposa',
    distance: 200,
    poolLengths: [25, 50],
  },

  // Espalda
  {
    id: '50-back',
    name: '50m Espalda',
    shortName: '50 Espalda',
    stroke: 'backstroke',
    strokeLabel: 'Espalda',
    distance: 50,
    poolLengths: [25, 50],
  },
  {
    id: '100-back',
    name: '100m Espalda',
    shortName: '100 Espalda',
    stroke: 'backstroke',
    strokeLabel: 'Espalda',
    distance: 100,
    poolLengths: [25, 50],
  },
  {
    id: '200-back',
    name: '200m Espalda',
    shortName: '200 Espalda',
    stroke: 'backstroke',
    strokeLabel: 'Espalda',
    distance: 200,
    poolLengths: [25, 50],
  },

  // Pecho
  {
    id: '50-breast',
    name: '50m Pecho',
    shortName: '50 Pecho',
    stroke: 'breaststroke',
    strokeLabel: 'Pecho',
    distance: 50,
    poolLengths: [25, 50],
  },
  {
    id: '100-breast',
    name: '100m Pecho',
    shortName: '100 Pecho',
    stroke: 'breaststroke',
    strokeLabel: 'Pecho',
    distance: 100,
    poolLengths: [25, 50],
  },
  {
    id: '200-breast',
    name: '200m Pecho',
    shortName: '200 Pecho',
    stroke: 'breaststroke',
    strokeLabel: 'Pecho',
    distance: 200,
    poolLengths: [25, 50],
  },

  // Libre (Crol)
  {
    id: '50-free',
    name: '50m Libre',
    shortName: '50 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 50,
    poolLengths: [25, 50],
  },
  {
    id: '100-free',
    name: '100m Libre',
    shortName: '100 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 100,
    poolLengths: [25, 50],
  },
  {
    id: '200-free',
    name: '200m Libre',
    shortName: '200 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 200,
    poolLengths: [25, 50],
  },
  {
    id: '400-free',
    name: '400m Libre',
    shortName: '400 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 400,
    poolLengths: [25, 50],
  },
  {
    id: '800-free',
    name: '800m Libre',
    shortName: '800 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 800,
    poolLengths: [25, 50],
  },
  {
    id: '1500-free',
    name: '1500m Libre',
    shortName: '1500 Libre',
    stroke: 'freestyle',
    strokeLabel: 'Libre',
    distance: 1500,
    poolLengths: [25, 50],
  },

  // Combinado Individual (Medley)
  {
    id: '100-medley',
    name: '100m Combinado',
    shortName: '100 Combinado',
    stroke: 'medley',
    strokeLabel: 'Combinado',
    distance: 100,
    poolLengths: [25],
  },
  {
    id: '200-medley',
    name: '200m Combinado',
    shortName: '200 Combinado',
    stroke: 'medley',
    strokeLabel: 'Combinado',
    distance: 200,
    poolLengths: [25, 50],
  },
  {
    id: '400-medley',
    name: '400m Combinado',
    shortName: '400 Combinado',
    stroke: 'medley',
    strokeLabel: 'Combinado',
    distance: 400,
    poolLengths: [25, 50],
  },
];

export const STROKE_META: Record<
  SwimStroke,
  { label: string; badgeClass: string; accentColor: string }
> = {
  butterfly: {
    label: 'Mariposa',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
  },
  backstroke: {
    label: 'Espalda',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    accentColor: '#38bdf8',
  },
  breaststroke: {
    label: 'Pecho',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
  },
  freestyle: {
    label: 'Libre',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    accentColor: '#06b6d4',
  },
  medley: {
    label: 'Combinado',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    accentColor: '#a855f7',
  },
};

export const WATER_FEEL_LABELS: Record<
  WaterFeel,
  { label: string; shortLabel: string; emoji: string; colorClass: string }
> = {
  1: {
    label: '1 · Pesado / Fatigado',
    shortLabel: 'Pesado',
    emoji: '🥵',
    colorClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
  },
  2: {
    label: '2 · Incómodo',
    shortLabel: 'Incómodo',
    emoji: '😕',
    colorClass: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40',
  },
  3: {
    label: '3 · Normal / Sólido',
    shortLabel: 'Normal',
    emoji: '🏊',
    colorClass: 'bg-slate-500/20 text-slate-700 dark:text-slate-200 border-slate-500/40',
  },
  4: {
    label: '4 · Fluido / Fuerte',
    shortLabel: 'Fluido',
    emoji: '⚡',
    colorClass: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40',
  },
  5: {
    label: '5 · Explosivo / Tope',
    shortLabel: 'Explosivo',
    emoji: '🚀',
    colorClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  },
};

export const CONTEXT_LABELS: Record<MarkContext, { label: string; badgeClass: string }> = {
  race: {
    label: 'Carrera / Torneo',
    badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  training: {
    label: 'Entrenamiento',
    badgeClass: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
  },
};

export const MODALITY_LABELS: Record<
  MarkModality,
  { label: string; shortLabel: string; validForOfficialPB: boolean }
> = {
  individual: {
    label: 'Individual',
    shortLabel: 'Individual',
    validForOfficialPB: true,
  },
  relay_lead: {
    label: 'Posta · 1er Relevo (Largada estática)',
    shortLabel: 'Posta 1° Relevo',
    validForOfficialPB: true,
  },
  relay_flying: {
    label: 'Posta · Relevo Lanzado (2° a 4°)',
    shortLabel: 'Posta Lanzada',
    validForOfficialPB: false,
  },
};

export const TIMING_LABELS: Record<TimingMethod, { label: string; shortLabel: string }> = {
  electronic: {
    label: 'Electrónico / Placa',
    shortLabel: 'Electrónico',
  },
  manual: {
    label: 'Manual / Cronómetro',
    shortLabel: 'Manual',
  },
};

export function getEventById(id: SwimEventId): SwimEvent {
  const found = SWIM_EVENTS.find((e) => e.id === id);
  if (!found) {
    return SWIM_EVENTS[0];
  }
  return found;
}

export function getEventsForPool(poolLength: PoolLength): SwimEvent[] {
  return SWIM_EVENTS.filter((e) => e.poolLengths.includes(poolLength));
}

export function getDefaultSplitGranularity(
  distance: SwimDistance,
  poolLength: PoolLength
): SplitGranularity {
  if (distance === 50) return '50m-race';
  if (distance === 100 || distance === 200) {
    return poolLength === 25 ? '25m' : '50m';
  }
  return '50m';
}

export function getAvailableSplitGranularities(distance: SwimDistance): SplitGranularity[] {
  if (distance === 50) return ['50m-race'];
  if (distance === 100 || distance === 200) return ['25m', '50m'];
  return ['50m', '100m'];
}

/**
 * Devuelve la lista ordenada de puntos de control en metros (acumulados desde la largada)
 * según la distancia de la prueba, la granularidad elegida y si se incluye el paso por 15m.
 */
export function getSplitCheckpoints(
  distance: SwimDistance,
  granularity: SplitGranularity,
  include15m = false
): number[] {
  if (distance === 50 || granularity === '50m-race') {
    return [15, 25, 35, 50];
  }

  const step = granularity === '25m' ? 25 : granularity === '100m' ? 100 : 50;
  const checkpoints: number[] = [];

  if (include15m && (distance === 100 || distance === 200)) {
    checkpoints.push(15);
  }

  for (let d = step; d <= distance; d += step) {
    checkpoints.push(d);
  }

  if (checkpoints[checkpoints.length - 1] !== distance) {
    checkpoints.push(distance);
  }

  return checkpoints;
}

