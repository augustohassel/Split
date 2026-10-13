import {
  ComputedLapSplit,
  EventPersonalBests,
  GoalGapAnalysis,
  MarkContext,
  MarkModality,
  PoolLength,
  SplitEntry,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerGender,
} from '../types';
import { getEventById, SWIM_EVENTS } from './events';
import { calculateFinaPoints } from './fina';

/**
 * Parsea una cadena de tiempo flexible ("26.45", "26,45", "1:02.45", "0:26.8")
 * y devuelve el total en segundos redondeado a centésimas, o null si es inválido.
 */
export function parseTimeInput(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;

  // Formato mm:ss.cc o hh:mm:ss.cc
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length < 2 || parts.length > 3) return null;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 3) {
      hours = Number(parts[0]);
      minutes = Number(parts[1]);
      seconds = Number(parts[2]);
    } else {
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
    }

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      hours < 0 ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60 ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes)
    ) {
      return null;
    }

    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? Math.round(total * 100) / 100 : null;
  }

  // Formato directo en segundos ("26.80", "58.1")
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) {
    return null;
  }
  const sec = Number(cleaned);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.round(sec * 100) / 100;
}

/**
 * Formatea segundos en representación estándar de natación:
 * - < 60s -> "ss.cc" (ej. "26.45") o "0:26.45" si alwaysShowMinutes = true
 * - >= 60s -> "m:ss.cc" (ej. "1:02.40")
 */
export function formatSwimTime(timeSec: number, alwaysShowMinutes = false): string {
  if (!Number.isFinite(timeSec) || timeSec <= 0) return '0.00';

  const totalCentiseconds = Math.round(timeSec * 100);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const remCentiseconds = totalCentiseconds % 6000;
  const seconds = Math.floor(remCentiseconds / 100);
  const centis = remCentiseconds % 100;

  const centisStr = centis.toString().padStart(2, '0');

  if (minutes > 0 || alwaysShowMinutes) {
    const secStr = seconds.toString().padStart(2, '0');
    return `${minutes}:${secStr}.${centisStr}`;
  }

  return `${seconds}.${centisStr}`;
}

/**
 * Formatea una brecha o diferencia de tiempo en segundos (ej. "-0.34s", "+1.12s")
 */
export function formatTimeDelta(deltaSec: number): string {
  if (!Number.isFinite(deltaSec)) return '0.00s';
  const rounded = Math.round(deltaSec * 100) / 100;
  if (Math.abs(rounded) < 0.005) return '0.00s';
  const sign = rounded > 0 ? '+' : '-';
  const absVal = Math.abs(rounded);
  return `${sign}${formatSwimTime(absVal)}s`;
}

/**
 * Calcula los tramos parciales individuales a partir de una lista de tiempos acumulados.
 */
export function computeLapSplits(
  splits: SplitEntry[],
  totalTimeSec?: number,
  totalDistance?: number
): ComputedLapSplit[] {
  const validMap = new Map<number, SplitEntry>();

  for (const s of splits) {
    if (
      Number.isFinite(s.distance) &&
      s.distance > 0 &&
      Number.isFinite(s.cumulativeTimeSec) &&
      s.cumulativeTimeSec > 0
    ) {
      validMap.set(s.distance, {
        distance: s.distance,
        cumulativeTimeSec: Math.round(s.cumulativeTimeSec * 100) / 100,
        strokeCount: s.strokeCount,
        dolphinKicks: s.dolphinKicks,
      });
    }
  }

  if (
    totalDistance &&
    totalDistance > 0 &&
    totalTimeSec &&
    totalTimeSec > 0 &&
    !validMap.has(totalDistance)
  ) {
    validMap.set(totalDistance, {
      distance: totalDistance,
      cumulativeTimeSec: Math.round(totalTimeSec * 100) / 100,
    });
  }

  const sorted = Array.from(validMap.values()).sort((a, b) => a.distance - b.distance);
  const result: ComputedLapSplit[] = [];

  let prevDistance = 0;
  let prevCumulative = 0;

  for (const curr of sorted) {
    const lapTime = Math.round((curr.cumulativeTimeSec - prevCumulative) * 100) / 100;
    if (lapTime <= 0) {
      continue;
    }
    const segmentDistance = curr.distance - prevDistance;
    result.push({
      fromDistance: prevDistance,
      toDistance: curr.distance,
      segmentDistance,
      label: `${prevDistance}-${curr.distance}m`,
      cumulativeTimeSec: curr.cumulativeTimeSec,
      lapTimeSec: lapTime,
      strokeCount: curr.strokeCount,
      dolphinKicks: curr.dolphinKicks,
    });
    prevDistance = curr.distance;
    prevCumulative = curr.cumulativeTimeSec;
  }

  return result;
}

/**
 * Indica si la modalidad tiene largada estática (válida para Récord Personal y Puntos FINA oficiales).
 * Excluye relevos lanzados (2° a 4° relevo).
 */
export function isStaticStartModality(modality: MarkModality): boolean {
  return modality === 'individual' || modality === 'relay_lead';
}

/**
 * Obtiene los Récords Personales separados por contexto:
 * - racePB (Principal): Mejor marca en Carrera con largada estática.
 * - trainingPB: Mejor marca en Entrenamiento con largada estática.
 */
export function getPersonalBestsForEvent(
  marks: SwimMark[],
  eventId: SwimEventId,
  poolLength: PoolLength
): EventPersonalBests {
  const validMarks = marks.filter(
    (m) =>
      m.eventId === eventId &&
      m.poolLength === poolLength &&
      isStaticStartModality(m.modality) &&
      m.timeSec > 0
  );

  let racePB: SwimMark | undefined;
  let trainingPB: SwimMark | undefined;
  let latestMark: SwimMark | undefined;

  for (const m of validMarks) {
    if (m.context === 'race') {
      if (!racePB || m.timeSec < racePB.timeSec) {
        racePB = m;
      }
    } else if (m.context === 'training') {
      if (!trainingPB || m.timeSec < trainingPB.timeSec) {
        trainingPB = m;
      }
    }

    if (!latestMark || m.date > latestMark.date || (m.date === latestMark.date && (m.id ?? 0) > (latestMark.id ?? 0))) {
      latestMark = m;
    }
  }

  return {
    eventId,
    poolLength,
    racePB,
    trainingPB,
    latestMark,
  };
}

/**
 * Determina si una marca específica es el PB actual en su contexto ('race' o 'training')
 */
export function getMarkPBStatus(
  mark: SwimMark,
  allMarks: SwimMark[]
): 'race-pb' | 'training-pb' | null {
  if (!isStaticStartModality(mark.modality)) return null;
  const pbs = getPersonalBestsForEvent(allMarks, mark.eventId, mark.poolLength);

  if (mark.context === 'race' && pbs.racePB) {
    if (mark.id !== undefined && pbs.racePB.id === mark.id) return 'race-pb';
    if (Math.abs(mark.timeSec - pbs.racePB.timeSec) < 0.001) return 'race-pb';
  }

  if (mark.context === 'training' && pbs.trainingPB) {
    if (mark.id !== undefined && pbs.trainingPB.id === mark.id) return 'training-pb';
    if (Math.abs(mark.timeSec - pbs.trainingPB.timeSec) < 0.001) return 'training-pb';
  }

  return null;
}

/**
 * Verifica antes de guardar (o al guardar) si un nuevo tiempo constituye un nuevo PB
 * en su respectivo contexto (Carrera o Entrenamiento).
 */
export function checkNewPersonalBestCandidate(
  timeSec: number,
  eventId: SwimEventId,
  poolLength: PoolLength,
  context: MarkContext,
  modality: MarkModality,
  existingMarks: SwimMark[],
  excludeMarkId?: number
): { isNewPB: boolean; previousBestSec?: number; improvementSec?: number } {
  if (!isStaticStartModality(modality) || !Number.isFinite(timeSec) || timeSec <= 0) {
    return { isNewPB: false };
  }

  const filtered = existingMarks.filter((m) => m.id !== excludeMarkId);
  const pbs = getPersonalBestsForEvent(filtered, eventId, poolLength);
  const referencePB = context === 'race' ? pbs.racePB : pbs.trainingPB;

  if (!referencePB) {
    return { isNewPB: true };
  }

  if (timeSec < referencePB.timeSec) {
    return {
      isNewPB: true,
      previousBestSec: referencePB.timeSec,
      improvementSec: Math.round((referencePB.timeSec - timeSec) * 100) / 100,
    };
  }

  return {
    isNewPB: false,
    previousBestSec: referencePB.timeSec,
    improvementSec: Math.round((referencePB.timeSec - timeSec) * 100) / 100,
  };
}

/**
 * Analiza la brecha de un Objetivo frente al PB de Carrera (prioritario), PB de Entrenamiento y última marca.
 */
export function analyzeGoalGap(
  goal: SwimGoal,
  marks: SwimMark[],
  gender: SwimmerGender
): GoalGapAnalysis {
  const event = getEventById(goal.eventId);
  const targetFinaPoints = calculateFinaPoints(
    goal.targetTimeSec,
    goal.eventId,
    goal.poolLength,
    gender
  );
  const pbs = getPersonalBestsForEvent(marks, goal.eventId, goal.poolLength);

  const gapVsRacePBSec = pbs.racePB
    ? Math.round((pbs.racePB.timeSec - goal.targetTimeSec) * 100) / 100
    : undefined;

  const gapVsTrainingPBSec = pbs.trainingPB
    ? Math.round((pbs.trainingPB.timeSec - goal.targetTimeSec) * 100) / 100
    : undefined;

  const gapVsLatestSec = pbs.latestMark
    ? Math.round((pbs.latestMark.timeSec - goal.targetTimeSec) * 100) / 100
    : undefined;

  const achievedInRace = gapVsRacePBSec !== undefined && gapVsRacePBSec <= 0;
  const achievedInTraining = gapVsTrainingPBSec !== undefined && gapVsTrainingPBSec <= 0;

  // Cálculo de porcentaje de cercanía tomando como referencia prioritaria el PB de Carrera
  const primaryMark = pbs.racePB ?? pbs.trainingPB;
  let progressPercent = 0;
  if (primaryMark && primaryMark.timeSec > 0) {
    if (primaryMark.timeSec <= goal.targetTimeSec) {
      progressPercent = 100;
    } else {
      const ratio = goal.targetTimeSec / primaryMark.timeSec;
      progressPercent = Math.max(10, Math.min(99, Math.round(Math.pow(ratio, 3) * 100)));
    }
  }

  return {
    goal,
    event,
    targetFinaPoints,
    racePB: pbs.racePB,
    trainingPB: pbs.trainingPB,
    latestMark: pbs.latestMark,
    gapVsRacePBSec,
    gapVsTrainingPBSec,
    gapVsLatestSec,
    achievedInRace,
    achievedInTraining,
    progressPercent,
  };
}

export interface EventRankingRow {
  eventId: SwimEventId;
  eventName: string;
  poolLength: PoolLength;
  /** PB de Carrera (principal) */
  racePB?: SwimMark;
  raceFinaPoints: number;
  /** PB de Entrenamiento (secundario) */
  trainingPB?: SwimMark;
  trainingFinaPoints: number;
  /** Puntos de referencia para ordenar (prioriza PB de Carrera; si no hay, usa PB de Entrenamiento) */
  sortFinaPoints: number;
  primaryContext: MarkContext;
  primaryMark: SwimMark;
}

/**
 * Construye el ranking personal de pruebas ordenado de mayor a menor Puntaje FINA,
 * priorizando el PB de Carrera sobre el PB de Entrenamiento.
 */
export function buildEventFinaRanking(
  marks: SwimMark[],
  gender: SwimmerGender,
  poolFilter: PoolLength | 'all' = 'all'
): EventRankingRow[] {
  const rows: EventRankingRow[] = [];
  const pools: PoolLength[] = poolFilter === 'all' ? [25, 50] : [poolFilter];

  for (const event of SWIM_EVENTS) {
    for (const pool of pools) {
      if (!event.poolLengths.includes(pool)) continue;
      const pbs = getPersonalBestsForEvent(marks, event.id, pool);
      if (!pbs.racePB && !pbs.trainingPB) continue;

      const raceFinaPoints = pbs.racePB
        ? calculateFinaPoints(pbs.racePB.timeSec, event.id, pool, gender)
        : 0;
      const trainingFinaPoints = pbs.trainingPB
        ? calculateFinaPoints(pbs.trainingPB.timeSec, event.id, pool, gender)
        : 0;

      // Prioridad estricta al PB de Carrera cuando existe
      const primaryMark = pbs.racePB ?? pbs.trainingPB!;
      const primaryContext: MarkContext = pbs.racePB ? 'race' : 'training';
      const sortFinaPoints = pbs.racePB ? raceFinaPoints : trainingFinaPoints;

      rows.push({
        eventId: event.id,
        eventName: event.name,
        poolLength: pool,
        racePB: pbs.racePB,
        raceFinaPoints,
        trainingPB: pbs.trainingPB,
        trainingFinaPoints,
        sortFinaPoints,
        primaryContext,
        primaryMark,
      });
    }
  }

  return rows.sort((a, b) => {
    // Primero las que tienen PB de Carrera si empatan o por puntaje FINA descendente
    if (b.sortFinaPoints !== a.sortFinaPoints) {
      return b.sortFinaPoints - a.sortFinaPoints;
    }
    return a.primaryMark.timeSec - b.primaryMark.timeSec;
  });
}

