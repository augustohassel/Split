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

const LOCAL_MIRROR_KEY = 'split_db_mirror_v1';

export interface LocalDatabaseMirror {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  updatedAt: string;
}

function isCustomProfile(p?: SwimmerProfile | null): boolean {
  if (!p) return false;
  return (
    p.name !== DEFAULT_SWIMMER_PROFILE.name ||
    p.gender !== DEFAULT_SWIMMER_PROFILE.gender ||
    Boolean(p.club) ||
    p.defaultPoolLength !== DEFAULT_SWIMMER_PROFILE.defaultPoolLength ||
    p.category !== DEFAULT_SWIMMER_PROFILE.category
  );
}

export function readLocalMirror(): LocalDatabaseMirror | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LOCAL_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseMirror>;
    if (!parsed || !Array.isArray(parsed.marks) || !Array.isArray(parsed.goals)) {
      return null;
    }
    const profile: SwimmerProfile =
      parsed.profile && parsed.profile.name
        ? { ...DEFAULT_SWIMMER_PROFILE, ...parsed.profile, id: 1 }
        : { ...DEFAULT_SWIMMER_PROFILE, id: 1 };
    return {
      profile,
      marks: parsed.marks,
      goals: parsed.goals,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeLocalMirror(
  profile: SwimmerProfile,
  marks: SwimMark[],
  goals: SwimGoal[]
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload: LocalDatabaseMirror = {
      profile: { ...profile, id: 1 },
      marks,
      goals,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(payload));
  } catch {
    // Ignorar si quota está llena
  }
}

export async function syncDatabaseToMirror(): Promise<void> {
  try {
    const allProfiles = await db.profile.toArray();
    const chosenProfile =
      allProfiles.find((p) => isCustomProfile(p)) ??
      allProfiles[allProfiles.length - 1] ?? {
        ...DEFAULT_SWIMMER_PROFILE,
        id: 1,
      };
    const marks = await db.marks.toArray();
    const goals = await db.goals.toArray();
    writeLocalMirror({ ...chosenProfile, id: 1 }, marks, goals);
  } catch {
    // Ignorar fallos de lectura de IDB
  }
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      await navigator.storage.persist();
    }
  } catch {
    // Ignorar en navegadores sin soporte
  }
}

let hydrationPromise: Promise<SwimmerProfile> | null = null;

/**
 * Inicializa y verifica la base de datos garantizando que:
 * 1. Exista un único perfil canónico (id = 1) sin condiciones de carrera en StrictMode.
 * 2. Si IndexedDB se abrió vacía tras un reinicio móvil pero existe respaldo en localStorage,
 *    se restauren automáticamente las marcas, objetivos y perfil.
 * 3. Se mantenga sincronizado el espejo local instantáneo.
 */
export async function ensureDefaultProfile(): Promise<SwimmerProfile> {
  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    await requestPersistentStorage();
    const mirror = readLocalMirror();

    try {
      const allProfiles = await db.profile.toArray();
      const idbMarksCount = await db.marks.count();
      const idbGoalsCount = await db.goals.count();

      // Recuperación automática si IndexedDB está vacía pero el espejo local tiene datos del usuario
      if (
        mirror &&
        idbMarksCount === 0 &&
        idbGoalsCount === 0 &&
        (mirror.marks.length > 0 || mirror.goals.length > 0 || isCustomProfile(mirror.profile))
      ) {
        await db.transaction('rw', db.profile, db.marks, db.goals, async () => {
          await db.profile.clear();
          await db.profile.put({ ...mirror.profile, id: 1 });
          if (mirror.marks.length > 0) {
            await db.marks.bulkPut(mirror.marks);
          }
          if (mirror.goals.length > 0) {
            await db.goals.bulkPut(mirror.goals);
          }
        });
        return { ...mirror.profile, id: 1 };
      }

      if (allProfiles.length > 0) {
        // Si hay más de un perfil por ejecuciones concurrentes previas, consolidar en id=1
        const bestProfile =
          allProfiles.find((p) => isCustomProfile(p)) ?? allProfiles[allProfiles.length - 1];
        const canonical: SwimmerProfile = { ...bestProfile, id: 1 };
        if (allProfiles.length > 1 || bestProfile.id !== 1) {
          await db.transaction('rw', db.profile, async () => {
            await db.profile.clear();
            await db.profile.put(canonical);
          });
        }
        await syncDatabaseToMirror();
        return canonical;
      }

      const initialProfile: SwimmerProfile = mirror?.profile
        ? { ...mirror.profile, id: 1 }
        : {
            ...DEFAULT_SWIMMER_PROFILE,
            id: 1,
            updatedAt: new Date().toISOString(),
          };

      await db.profile.put(initialProfile);
      await syncDatabaseToMirror();
      return initialProfile;
    } catch {
      return (
        mirror?.profile ?? {
          ...DEFAULT_SWIMMER_PROFILE,
          id: 1,
        }
      );
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

export async function saveMarkToDb(
  markData: Omit<SwimMark, 'id'>,
  existingId?: number
): Promise<SwimMark> {
  try {
    if (existingId !== undefined) {
      const saved: SwimMark = { ...markData, id: existingId };
      await db.marks.put(saved);
      await syncDatabaseToMirror();
      return saved;
    }
    const id = await db.marks.add(markData);
    const saved: SwimMark = { ...markData, id };
    await syncDatabaseToMirror();
    return saved;
  } catch {
    const mirror = readLocalMirror();
    const currentMarks = mirror?.marks ?? [];
    const fallbackId =
      existingId ??
      (currentMarks.reduce((max, m) => Math.max(max, m.id ?? 0), 0) + 1);
    const saved: SwimMark = { ...markData, id: fallbackId };
    const nextMarks =
      existingId !== undefined
        ? currentMarks.map((m) => (m.id === existingId ? saved : m))
        : [...currentMarks, saved];
    writeLocalMirror(
      mirror?.profile ?? { ...DEFAULT_SWIMMER_PROFILE, id: 1 },
      nextMarks,
      mirror?.goals ?? []
    );
    return saved;
  }
}

export async function deleteMarkFromDb(id: number): Promise<void> {
  try {
    await db.marks.delete(id);
    await syncDatabaseToMirror();
  } catch {
    const mirror = readLocalMirror();
    if (mirror) {
      writeLocalMirror(
        mirror.profile,
        mirror.marks.filter((m) => m.id !== id),
        mirror.goals
      );
    }
  }
}

export async function updateProfileInDb(updated: SwimmerProfile): Promise<SwimmerProfile> {
  const canonical: SwimmerProfile = {
    ...updated,
    id: 1,
    updatedAt: new Date().toISOString(),
  };
  try {
    await db.transaction('rw', db.profile, async () => {
      await db.profile.clear();
      await db.profile.put(canonical);
    });
    await syncDatabaseToMirror();
  } catch {
    const mirror = readLocalMirror();
    writeLocalMirror(canonical, mirror?.marks ?? [], mirror?.goals ?? []);
  }
  return canonical;
}

export async function saveGoalToDb(goalData: Omit<SwimGoal, 'id'>): Promise<SwimGoal> {
  try {
    const existing = await db.goals
      .where('[eventId+poolLength]')
      .equals([goalData.eventId, goalData.poolLength])
      .first();

    if (existing && existing.id !== undefined) {
      const saved: SwimGoal = { ...goalData, id: existing.id };
      await db.goals.put(saved);
      await syncDatabaseToMirror();
      return saved;
    }
    const id = await db.goals.add(goalData);
    const saved: SwimGoal = { ...goalData, id };
    await syncDatabaseToMirror();
    return saved;
  } catch {
    const mirror = readLocalMirror();
    const currentGoals = mirror?.goals ?? [];
    const existing = currentGoals.find(
      (g) => g.eventId === goalData.eventId && g.poolLength === goalData.poolLength
    );
    const fallbackId =
      existing?.id ??
      (currentGoals.reduce((max, g) => Math.max(max, g.id ?? 0), 0) + 1);
    const saved: SwimGoal = { ...goalData, id: fallbackId };
    const nextGoals = existing
      ? currentGoals.map((g) => (g.id === existing.id ? saved : g))
      : [...currentGoals, saved];
    writeLocalMirror(
      mirror?.profile ?? { ...DEFAULT_SWIMMER_PROFILE, id: 1 },
      mirror?.marks ?? [],
      nextGoals
    );
    return saved;
  }
}

export async function deleteGoalFromDb(id: number): Promise<void> {
  try {
    await db.goals.delete(id);
    await syncDatabaseToMirror();
  } catch {
    const mirror = readLocalMirror();
    if (mirror) {
      writeLocalMirror(
        mirror.profile,
        mirror.marks,
        mirror.goals.filter((g) => g.id !== id)
      );
    }
  }
}

/**
 * Carga el conjunto de datos de demostración bajo demanda desde Ajustes.
 */
export async function loadDemoDataset(): Promise<{ marksAdded: number; goalsAdded: number }> {
  await ensureDefaultProfile();
  await db.transaction('rw', db.marks, db.goals, async () => {
    await db.marks.clear();
    await db.goals.clear();
    await db.marks.bulkAdd(DEMO_MARKS.map((m) => ({ ...m })));
    await db.goals.bulkAdd(DEMO_GOALS.map((g) => ({ ...g })));
  });
  await syncDatabaseToMirror();

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
      await db.profile.put({
        ...DEFAULT_SWIMMER_PROFILE,
        id: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  });
  await syncDatabaseToMirror();
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
  const profile = (await db.profile.get(1)) ?? (await db.profile.toCollection().first());
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
      await db.profile.put({
        ...restProfile,
        id: 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const existing = await db.profile.get(1);
      if (!existing) {
        await db.profile.put({
          ...DEFAULT_SWIMMER_PROFILE,
          id: 1,
          updatedAt: new Date().toISOString(),
        });
      }
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

  await syncDatabaseToMirror();

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

