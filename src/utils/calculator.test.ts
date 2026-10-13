import { describe, expect, it } from 'vitest';
import {
  analyzeGoalGap,
  buildEventFinaRanking,
  checkNewPersonalBestCandidate,
  computeLapSplits,
  formatSwimTime,
  formatTimeDelta,
  getMarkPBStatus,
  getPersonalBestsForEvent,
  parseTimeInput,
} from './calculator';
import { getEventsForPool, getSplitCheckpoints, SWIM_EVENTS } from './events';
import { calculateFinaPoints, calculateTimeForFinaPoints, getFinaBaseTime } from './fina';
import { SwimGoal, SwimMark } from '../types';

describe('Catálogo de Pruebas y Puntos de Corte de Parciales', () => {
  it('incluye las 18 pruebas oficiales de pileta y restringe 100m Combinado a 25m', () => {
    expect(SWIM_EVENTS).toHaveLength(18);
    expect(getEventsForPool(25)).toHaveLength(18);
    expect(getEventsForPool(50)).toHaveLength(17);
  });

  it('genera puntos de control 15m, 25m, 35m y 50m para pruebas de 50m', () => {
    expect(getSplitCheckpoints(50, '50m-race')).toEqual([15, 25, 35, 50]);
  });

  it('genera puntos de control dinámicos para 100m, 200m y fondo con paso opcional por 15m', () => {
    expect(getSplitCheckpoints(100, '25m', true)).toEqual([15, 25, 50, 75, 100]);
    expect(getSplitCheckpoints(100, '50m', false)).toEqual([50, 100]);
    expect(getSplitCheckpoints(400, '100m', false)).toEqual([100, 200, 300, 400]);
  });
});

describe('Parser y Formateador de Tiempos', () => {
  it('parsea formatos abreviados en segundos, con coma decimal y con minutos', () => {
    expect(parseTimeInput('26.45')).toBe(26.45);
    expect(parseTimeInput('26,8')).toBe(26.8);
    expect(parseTimeInput('0:26.45')).toBe(26.45);
    expect(parseTimeInput('1:02.40')).toBe(62.4);
    expect(parseTimeInput('15:20.48')).toBe(920.48);
  });

  it('rechaza entradas inválidas o segundos >= 60 en formato mm:ss.cc', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('-25.00')).toBeNull();
    expect(parseTimeInput('1:65.00')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
  });

  it('formatea correctamente marcas cortas (< 60s) y medias/largas (>= 60s)', () => {
    expect(formatSwimTime(26.4)).toBe('26.40');
    expect(formatSwimTime(62.05)).toBe('1:02.05');
    expect(formatTimeDelta(-0.35)).toBe('-0.35s');
    expect(formatTimeDelta(1.2)).toBe('+1.20s');
  });
});

describe('Cálculo de Tramos Parciales (Splits)', () => {
  it('descompone correctamente un 50m Mariposa en tramos 0-15m, 15-25m, 25-35m y 35-50m', () => {
    const splits = [
      { distance: 15, cumulativeTimeSec: 6.4, dolphinKicks: 7 },
      { distance: 25, cumulativeTimeSec: 11.9, strokeCount: 6 },
      { distance: 35, cumulativeTimeSec: 17.8, dolphinKicks: 5 },
      { distance: 50, cumulativeTimeSec: 26.5, strokeCount: 9 },
    ];
    const laps = computeLapSplits(splits, 26.5, 50);

    expect(laps).toHaveLength(4);
    expect(laps[0]).toMatchObject({ label: '0-15m', lapTimeSec: 6.4, dolphinKicks: 7 });
    expect(laps[1]).toMatchObject({ label: '15-25m', lapTimeSec: 5.5, strokeCount: 6 });
    expect(laps[2]).toMatchObject({ label: '25-35m', lapTimeSec: 5.9, dolphinKicks: 5 });
    expect(laps[3]).toMatchObject({ label: '35-50m', lapTimeSec: 8.7, strokeCount: 9 });
  });
});

describe('Motor de Puntos FINA (World Aquatics)', () => {
  it('otorga 1000 puntos cuando la marca iguala el tiempo base oficial', () => {
    const baseTimeMale50FlySCM = getFinaBaseTime('50-fly', 25, 'male')!;
    expect(calculateFinaPoints(baseTimeMale50FlySCM, '50-fly', 25, 'male')).toBe(1000);

    const baseTimeFemale100FreeLCM = getFinaBaseTime('100-free', 50, 'female')!;
    expect(calculateFinaPoints(baseTimeFemale100FreeLCM, '100-free', 50, 'female')).toBe(1000);
  });

  it('aplica P = floor(1000 * (B / T)^3) y calcula el tiempo inverso para un puntaje dado', () => {
    // 50m Mariposa Hombre 25m (B = 21.32s) -> con T = 26.86s: 1000 * (21.32 / 26.86)^3 = floor(500.09) = 500
    const pts = calculateFinaPoints(26.86, '50-fly', 25, 'male');
    expect(pts).toBe(500);

    const targetSec = calculateTimeForFinaPoints(500, '50-fly', 25, 'male');
    expect(targetSec).toBeCloseTo(26.86, 1);
  });
});

describe('Separación de PB de Carrera y PB de Entrenamiento', () => {
  const sampleMarks: SwimMark[] = [
    {
      id: 1,
      eventId: '50-fly',
      timeSec: 26.8,
      date: '2026-09-10',
      venue: 'Torneo Metropolitano',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 2,
      eventId: '50-fly',
      timeSec: 26.4,
      date: '2026-09-20',
      venue: 'Club Entrenamiento',
      poolLength: 25,
      context: 'training',
      modality: 'individual',
      timing: 'manual',
      splits: [],
      createdAt: '2026-09-20T10:00:00Z',
    },
    {
      id: 3,
      eventId: '50-fly',
      timeSec: 25.9,
      date: '2026-09-25',
      venue: 'Torneo Relevos (Posta Lanzada)',
      poolLength: 25,
      context: 'race',
      modality: 'relay_flying', // No válido para PB oficial
      timing: 'electronic',
      splits: [],
      createdAt: '2026-09-25T10:00:00Z',
    },
  ];

  it('separa el PB de Carrera del PB de Entrenamiento y excluye relevos lanzados', () => {
    const pbs = getPersonalBestsForEvent(sampleMarks, '50-fly', 25);
    expect(pbs.racePB?.id).toBe(1);
    expect(pbs.racePB?.timeSec).toBe(26.8);
    expect(pbs.trainingPB?.id).toBe(2);
    expect(pbs.trainingPB?.timeSec).toBe(26.4);

    expect(getMarkPBStatus(sampleMarks[0], sampleMarks)).toBe('race-pb');
    expect(getMarkPBStatus(sampleMarks[1], sampleMarks)).toBe('training-pb');
    expect(getMarkPBStatus(sampleMarks[2], sampleMarks)).toBeNull();
  });

  it('evalúa candidatos a nuevo PB dentro de su propio contexto (Carrera vs Entrenamiento)', () => {
    // 26.60s es nuevo PB de Carrera (supera 26.80s de Carrera aunque en entrenamiento haya 26.40s)
    const raceCandidate = checkNewPersonalBestCandidate(
      26.6,
      '50-fly',
      25,
      'race',
      'individual',
      sampleMarks
    );
    expect(raceCandidate.isNewPB).toBe(true);
    expect(raceCandidate.previousBestSec).toBe(26.8);
    expect(raceCandidate.improvementSec).toBe(0.2);

    // 26.60s NO es nuevo PB de Entrenamiento (el PB de Entrenamiento es 26.40s)
    const trainingCandidate = checkNewPersonalBestCandidate(
      26.6,
      '50-fly',
      25,
      'training',
      'individual',
      sampleMarks
    );
    expect(trainingCandidate.isNewPB).toBe(false);
  });

  it('prioriza el PB de Carrera en el análisis de Objetivos y en el Ranking FINA', () => {
    const goal: SwimGoal = {
      id: 1,
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: 26.0,
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const gap = analyzeGoalGap(goal, sampleMarks, 'male');
    expect(gap.gapVsRacePBSec).toBe(0.8); // 26.80 - 26.00
    expect(gap.gapVsTrainingPBSec).toBe(0.4); // 26.40 - 26.00
    expect(gap.achievedInRace).toBe(false);

    const ranking = buildEventFinaRanking(sampleMarks, 'male', 25);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].primaryContext).toBe('race');
    expect(ranking[0].primaryMark.timeSec).toBe(26.8);
  });
});

