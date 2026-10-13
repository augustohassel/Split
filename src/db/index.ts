import Dexie, { Table } from 'dexie';
import { SwimGoal, SwimMark, SwimmerGender, SwimmerProfile } from '../types';
import { DEFAULT_SWIMMER_PROFILE, DEMO_GOALS, DEMO_MARKS } from './seeds';
import { formatSwimTime } from '../utils/calculator';
import { CONTEXT_LABELS, getEventById, MODALITY_LABELS, TIMING_LABELS } from '../utils/events';
import { calculateFinaPoints } from '../utils/fina';

export class SplitDatabase extends Dexie {
  profile!: Table<SwimmerProfile, number>;
  marks!: Table<SwimMark, number>;
  goals!: Table<SwimGoal, number>;

  constructor() {
    super('SplitSwimmingDB');
    this.version(1).stores({
      profile: '++id',
      marks: '++id, eventId, date, poolLength, context, modality, timing',
      goals: '++id, eventId, poolLength, [eventId+poolLength]',
    });
  }
}

export const db = new SplitDatabase();

/**
 * Inicializa el perfil por defecto (con 50m Mariposa preseleccionada como favorita)
 * si la base de datos aún no tiene un perfil configurado.
 */
export async function ensureDefaultProfile(): Promise<SwimmerProfile> {
  const existing = await db.profile.toCollection().first();
  if (existing) {
    return existing;
  }
  const id = await db.profile.add({
    ...DEFAULT_SWIMMER_PROFILE,
    updatedAt: new Date().toISOString(),
  });
  return {
    ...DEFAULT_SWIMMER_PROFILE,
    id,
  };
}

/**
 * Carga el conjunto de datos de demostración bajo demanda desde Ajustes.
 */
export async function loadDemoDataset(): Promise<{ marksAdded: number; goalsAdded: number }> {
  await ensureDefaultProfile();
  await db.marks.clear();
  await db.goals.clear();

  await db.marks.bulkAdd(DEMO_MARKS.map((m) => ({ ...m })));
  await db.goals.bulkAdd(DEMO_GOALS.map((g) => ({ ...g })));

  return {
    marksAdded: DEMO_MARKS.length,
    goalsAdded: DEMO_GOALS.length,
  };
}

/**
 * Elimina todas las marcas y objetivos registrados localmente, y opcionalmente
 * restablece el perfil del nadador a los valores iniciales de fábrica.
 */
export async function clearAllData(resetProfile = false): Promise<void> {
  await db.transaction('rw', db.profile, db.marks, db.goals, async () => {
    await db.marks.clear();
    await db.goals.clear();
    if (resetProfile) {
      await db.profile.clear();
      await db.profile.add({
        ...DEFAULT_SWIMMER_PROFILE,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

export interface SplitBackupPayload {
  app: 'Split';
  version: string;
  exportedAt: string;
  profile?: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
}

export async function exportDatabaseAsJson(): Promise<string> {
  const profile = await db.profile.toCollection().first();
  const marks = await db.marks.toArray();
  const goals = await db.goals.toArray();

  const payload: SplitBackupPayload = {
    app: 'Split',
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0',
    exportedAt: new Date().toISOString(),
    profile,
    marks,
    goals,
  };

  return JSON.stringify(payload, null, 2);
}

export async function importDatabaseFromJson(
  jsonText: string
): Promise<{ marksImported: number; goalsImported: number }> {
  const parsed = JSON.parse(jsonText) as Partial<SplitBackupPayload>;

  if (!parsed || !Array.isArray(parsed.marks)) {
    throw new Error('Archivo JSON inválido: no contiene un arreglo de marcas ("marks").');
  }

  await db.transaction('rw', db.profile, db.marks, db.goals, async () => {
    if (parsed.profile && parsed.profile.name && parsed.profile.gender) {
      await db.profile.clear();
      const { id: _unusedId, ...restProfile } = parsed.profile;
      void _unusedId;
      await db.profile.add({
        ...restProfile,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ensureDefaultProfile();
    }

    await db.marks.clear();
    const sanitizedMarks: SwimMark[] = parsed.marks!.map((m) => {
      const { id: _unusedMarkId, ...rest } = m;
      void _unusedMarkId;
      return {
        ...rest,
        splits: Array.isArray(rest.splits) ? rest.splits : [],
      };
    });
    if (sanitizedMarks.length > 0) {
      await db.marks.bulkAdd(sanitizedMarks);
    }

    await db.goals.clear();
    const sanitizedGoals: SwimGoal[] = Array.isArray(parsed.goals)
      ? parsed.goals.map((g) => {
          const { id: _unusedGoalId, ...rest } = g;
          void _unusedGoalId;
          return rest;
        })
      : [];
    if (sanitizedGoals.length > 0) {
      await db.goals.bulkAdd(sanitizedGoals);
    }
  });

  return {
    marksImported: parsed.marks.length,
    goalsImported: Array.isArray(parsed.goals) ? parsed.goals.length : 0,
  };
}

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportMarksAsCsv(marks: SwimMark[], gender: SwimmerGender): string {
  const headers = [
    'Fecha',
    'Prueba',
    'Pileta (m)',
    'Tiempo',
    'Segundos',
    'Puntos FINA',
    'Contexto',
    'Modalidad',
    'Cronometraje',
    'Sede / Torneo',
    'Sensacion (1-5)',
    'Parciales (Acumulados)',
    'Notas',
  ];

  const sorted = [...marks].sort((a, b) => b.date.localeCompare(a.date));

  const rows = sorted.map((m) => {
    const event = getEventById(m.eventId);
    const fina = calculateFinaPoints(m.timeSec, m.eventId, m.poolLength, gender);
    const splitsSummary = (m.splits || [])
      .map((s) => `${s.distance}m: ${formatSwimTime(s.cumulativeTimeSec)}`)
      .join(' | ');

    return [
      m.date,
      event.name,
      `${m.poolLength}m`,
      formatSwimTime(m.timeSec),
      m.timeSec.toFixed(2),
      fina,
      CONTEXT_LABELS[m.context]?.label ?? m.context,
      MODALITY_LABELS[m.modality]?.shortLabel ?? m.modality,
      TIMING_LABELS[m.timing]?.shortLabel ?? m.timing,
      m.venue,
      m.feel ?? '',
      splitsSummary,
      m.notes ?? '',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

