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

// Estado en memoria siempre disponible incluso si localStorage o IndexedDB fallan
let memoryStore: LocalDatabaseMirror | null = null;

function isCustomProfile(p?: SwimmerProfile | null): boolean {
  if (!p) return false;
  return (
    p.name !== DEFAULT_SWIMMER_PROFILE.name ||
    p.gender !== DEFAULT_SWIMMER_PROFILE.gender ||
    Boolean(p.club) ||
    Boolean(p.birthYear) ||
    p.defaultPoolLength !== DEFAULT_SWIMMER_PROFILE.defaultPoolLength ||
    p.category !== DEFAULT_SWIMMER_PROFILE.category ||
    JSON.stringify(p.favoriteEventIds) !==
      JSON.stringify(DEFAULT_SWIMMER_PROFILE.favoriteEventIds)
  );
}

function createDefaultStore(): LocalDatabaseMirror {
  return {
    profile: {
      ...DEFAULT_SWIMMER_PROFILE,
      id: 1,
      updatedAt: new Date().toISOString(),
    },
    marks: [],
    goals: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readLocalMirror(): LocalDatabaseMirror | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_MIRROR_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LocalDatabaseMirror>;
        if (parsed && Array.isArray(parsed.marks) && Array.isArray(parsed.goals)) {
          const profile: SwimmerProfile =
            parsed.profile && parsed.profile.name
              ? {
                  ...DEFAULT_SWIMMER_PROFILE,
                  ...parsed.profile,
                  id: 1,
                  favoriteEventIds:
                    parsed.profile.favoriteEventIds && parsed.profile.favoriteEventIds.length > 0
                      ? parsed.profile.favoriteEventIds
                      : ['50-fly'],
                }
              : { ...DEFAULT_SWIMMER_PROFILE, id: 1 };
          const mirror: LocalDatabaseMirror = {
            profile,
            marks: parsed.marks,
            goals: parsed.goals,
            updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          };
          memoryStore = mirror;
          return mirror;
        }
      }
    }
  } catch {
    // Ignorar errores de parseo o permisos de localStorage
  }
  return memoryStore;
}

export function getStoreState(): LocalDatabaseMirror {
  const existing = readLocalMirror();
  if (existing) return existing;
  const initial = createDefaultStore();
  memoryStore = initial;
  return initial;
}

export function writeLocalMirror(
  profile: SwimmerProfile,
  marks: SwimMark[],
  goals: SwimGoal[]
): LocalDatabaseMirror {
  const payload: LocalDatabaseMirror = {
    profile: {
      ...DEFAULT_SWIMMER_PROFILE,
      ...profile,
      id: 1,
      name: profile.name?.trim() || 'Nadador',
      favoriteEventIds:
        profile.favoriteEventIds && profile.favoriteEventIds.length > 0
          ? profile.favoriteEventIds
          : ['50-fly'],
    },
    marks: [...marks],
    goals: [...goals],
    updatedAt: new Date().toISOString(),
  };

  memoryStore = payload;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(payload));
    }
  } catch {
    // Si la cuota de localStorage falla, memoryStore conserva los datos en sesión
  }

  return payload;
}

function withTimeout<T>(promise: Promise<T>, ms = 350): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, ms);

    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
  });
}

/**
 * Ejecuta una operación de IndexedDB en segundo plano sin bloquear jamás la interfaz.
 */
function runIdbInBackground(operation: () => Promise<void>): void {
  void withTimeout(operation(), 600);
}

/**
 * Inicializa y verifica la base de datos sin bloquear nunca el hilo principal:
 * - Si ya existe espejo en localStorage, lo devuelve de inmediato.
 * - Si no existe espejo en localStorage, intenta recuperar datos previos de IndexedDB
 *   con un timeout estricto de 350ms para evitar bloqueos en móviles.
 */
export async function ensureDefaultProfile(): Promise<SwimmerProfile> {
  const existing = readLocalMirror();
  if (existing) {
    // Sincronizar en segundo plano hacia IndexedDB sin bloquear
    runIdbInBackground(async () => {
      await db.profile.put(existing.profile);
    });
    return existing.profile;
  }

  const idbSnapshot = await withTimeout(
    (async () => {
      const allProfiles = await db.profile.toArray();
      const marks = await db.marks.toArray();
      const goals = await db.goals.toArray();
      return { allProfiles, marks, goals };
    })(),
    350
  );

  if (
    idbSnapshot &&
    (idbSnapshot.marks.length > 0 ||
      idbSnapshot.goals.length > 0 ||
      idbSnapshot.allProfiles.length > 0)
  ) {
    const chosenProfile =
      idbSnapshot.allProfiles.find((p) => isCustomProfile(p)) ??
      idbSnapshot.allProfiles[idbSnapshot.allProfiles.length - 1] ?? {
        ...DEFAULT_SWIMMER_PROFILE,
        id: 1,
      };
    const saved = writeLocalMirror(chosenProfile, idbSnapshot.marks, idbSnapshot.goals);
    return saved.profile;
  }

  const fresh = createDefaultStore();
  writeLocalMirror(fresh.profile, fresh.marks, fresh.goals);
  runIdbInBackground(async () => {
    await db.profile.put(fresh.profile);
  });
  return fresh.profile;
}

export async function saveMarkToDb(
  markData: Omit<SwimMark, 'id'>,
  existingId?: number
): Promise<SwimMark> {
  const store = getStoreState();
  const nextId =
    existingId ??
    store.marks.reduce((max, m) => Math.max(max, typeof m.id === 'number' ? m.id : 0), 0) + 1;

  const saved: SwimMark = {
    ...markData,
    id: nextId,
    splits: Array.isArray(markData.splits) ? markData.splits : [],
  };

  const exists = existingId !== undefined && store.marks.some((m) => m.id === existingId);
  const nextMarks = exists
    ? store.marks.map((m) => (m.id === existingId ? saved : m))
    : [...store.marks, saved];

  writeLocalMirror(store.profile, nextMarks, store.goals);

  runIdbInBackground(async () => {
    await db.marks.put(saved);
  });

  return saved;
}

export async function deleteMarkFromDb(id: number): Promise<void> {
  const store = getStoreState();
  const nextMarks = store.marks.filter((m) => m.id !== id);
  writeLocalMirror(store.profile, nextMarks, store.goals);

  runIdbInBackground(async () => {
    await db.marks.delete(id);
  });
}

export async function updateProfileInDb(updated: SwimmerProfile): Promise<SwimmerProfile> {
  const store = getStoreState();
  const canonical: SwimmerProfile = {
    ...DEFAULT_SWIMMER_PROFILE,
    ...updated,
    id: 1,
    name: updated.name?.trim() || 'Nadador',
    favoriteEventIds:
      updated.favoriteEventIds && updated.favoriteEventIds.length > 0
        ? updated.favoriteEventIds
        : ['50-fly'],
    updatedAt: new Date().toISOString(),
  };

  writeLocalMirror(canonical, store.marks, store.goals);

  runIdbInBackground(async () => {
    await db.profile.put(canonical);
  });

  return canonical;
}

export async function saveGoalToDb(goalData: Omit<SwimGoal, 'id'>): Promise<SwimGoal> {
  const store = getStoreState();
  const existing = store.goals.find(
    (g) => g.eventId === goalData.eventId && g.poolLength === goalData.poolLength
  );

  const nextId =
    existing?.id ??
    store.goals.reduce((max, g) => Math.max(max, typeof g.id === 'number' ? g.id : 0), 0) + 1;

  const saved: SwimGoal = {
    ...goalData,
    id: nextId,
  };

  const nextGoals = existing
    ? store.goals.map((g) =>
        g.eventId === goalData.eventId && g.poolLength === goalData.poolLength ? saved : g
      )
    : [...store.goals, saved];

  writeLocalMirror(store.profile, store.marks, nextGoals);

  runIdbInBackground(async () => {
    await db.goals.put(saved);
  });

  return saved;
}

export async function deleteGoalFromDb(id: number): Promise<void> {
  const store = getStoreState();
  const nextGoals = store.goals.filter((g) => g.id !== id);
  writeLocalMirror(store.profile, store.marks, nextGoals);

  runIdbInBackground(async () => {
    await db.goals.delete(id);
  });
}

/**
 * Carga el conjunto de datos de demostración bajo demanda desde Ajustes.
 */
export async function loadDemoDataset(): Promise<{ marksAdded: number; goalsAdded: number }> {
  const store = getStoreState();
  const demoMarksWithIds: SwimMark[] = DEMO_MARKS.map((m, i) => ({ ...m, id: i + 1 }));
  const demoGoalsWithIds: SwimGoal[] = DEMO_GOALS.map((g, i) => ({ ...g, id: i + 1 }));

  writeLocalMirror(store.profile, demoMarksWithIds, demoGoalsWithIds);

  runIdbInBackground(async () => {
    await db.transaction('rw', db.marks, db.goals, async () => {
      await db.marks.clear();
      await db.goals.clear();
      await db.marks.bulkPut(demoMarksWithIds);
      await db.goals.bulkPut(demoGoalsWithIds);
    });
  });

  return {
    marksAdded: demoMarksWithIds.length,
    goalsAdded: demoGoalsWithIds.length,
  };
}

/**
 * Elimina todas las marcas y objetivos registrados localmente, y opcionalmente
 * restablece el perfil del nadador a los valores iniciales de fábrica.
 */
export async function clearAllData(resetProfile = false): Promise<void> {
  const store = getStoreState();
  const nextProfile: SwimmerProfile = resetProfile
    ? {
        ...DEFAULT_SWIMMER_PROFILE,
        id: 1,
        updatedAt: new Date().toISOString(),
      }
    : store.profile;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('split_register_draft_v1');
      window.localStorage.removeItem('split_goal_draft_v1');
    }
  } catch {
    // Ignorar errores de localStorage
  }

  writeLocalMirror(nextProfile, [], []);

  runIdbInBackground(async () => {
    await db.transaction('rw', db.profile, db.marks, db.goals, async () => {
      await db.marks.clear();
      await db.goals.clear();
      if (resetProfile) {
        await db.profile.put(nextProfile);
      }
    });
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
  const store = getStoreState();

  const payload: SplitBackupPayload = {
    app: 'Split',
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.3',
    exportedAt: new Date().toISOString(),
    profile: store.profile,
    marks: store.marks,
    goals: store.goals,
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

  const store = getStoreState();
  const nextProfile: SwimmerProfile =
    parsed.profile && parsed.profile.name && parsed.profile.gender
      ? {
          ...DEFAULT_SWIMMER_PROFILE,
          ...parsed.profile,
          id: 1,
          updatedAt: new Date().toISOString(),
        }
      : store.profile;

  const sanitizedMarks: SwimMark[] = parsed.marks.map((m, idx) => ({
    ...m,
    id: idx + 1,
    splits: Array.isArray(m.splits) ? m.splits : [],
  }));

  const sanitizedGoals: SwimGoal[] = Array.isArray(parsed.goals)
    ? parsed.goals.map((g, idx) => ({
        ...g,
        id: idx + 1,
      }))
    : [];

  writeLocalMirror(nextProfile, sanitizedMarks, sanitizedGoals);

  runIdbInBackground(async () => {
    await db.transaction('rw', db.profile, db.marks, db.goals, async () => {
      await db.profile.put(nextProfile);
      await db.marks.clear();
      if (sanitizedMarks.length > 0) {
        await db.marks.bulkPut(sanitizedMarks);
      }
      await db.goals.clear();
      if (sanitizedGoals.length > 0) {
        await db.goals.bulkPut(sanitizedGoals);
      }
    });
  });

  return {
    marksImported: sanitizedMarks.length,
    goalsImported: sanitizedGoals.length,
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
