import { beforeEach, describe, expect, it } from 'vitest';
import {
  getFirebaseClient,
  isFirebaseConfigured,
  setFirebaseEnvOverrideForTests,
} from '../../infrastructure/firebase/firebase-client';
import {
  normalizeFirestoreError,
  sanitizeForFirestore,
} from './firestore-swim-repository';
import { ISwimRepository, SwimRepositorySnapshot } from './swim-repository.interface';
import {
  buildGoalKey,
  buildMarkFingerprint,
  migrateAndSyncLocalDataToCloud,
} from '../../services/cloud-migration.service';
import { ChatMessage, SwimGoal, SwimMark, SwimmerProfile } from '../../types';
import { writeLocalMirror } from '../index';

function createInMemorySwimRepo(
  mode: 'local' | 'cloud',
  initial?: Partial<SwimRepositorySnapshot>
): ISwimRepository & { state: SwimRepositorySnapshot } {
  const state: SwimRepositorySnapshot = {
    profile: initial?.profile ?? null,
    marks: [...(initial?.marks ?? [])],
    goals: [...(initial?.goals ?? [])],
    chatMessages: [...(initial?.chatMessages ?? [])],
  };

  return {
    mode,
    state,
    async getSnapshot() {
      return {
        profile: state.profile,
        marks: [...state.marks],
        goals: [...state.goals],
        chatMessages: [...state.chatMessages],
      };
    },
    async getProfile() {
      return state.profile;
    },
    async saveProfile(profile: SwimmerProfile) {
      state.profile = { ...profile, id: 1 };
      return state.profile;
    },
    async getMarks() {
      return [...state.marks];
    },
    async saveMark(mark: SwimMark) {
      const id = mark.id ?? state.marks.length + 1;
      const saved = { ...mark, id };
      state.marks = [...state.marks.filter((m) => m.id !== id), saved];
      return saved;
    },
    async bulkSaveMarks(marks: SwimMark[]) {
      for (const m of marks) {
        const id = m.id ?? state.marks.length + 1;
        state.marks = [...state.marks.filter((x) => x.id !== id), { ...m, id }];
      }
    },
    async deleteMark(id: number) {
      state.marks = state.marks.filter((m) => m.id !== id);
    },
    async getGoals() {
      return [...state.goals];
    },
    async saveGoal(goal: SwimGoal) {
      const id = goal.id ?? state.goals.length + 1;
      const saved = { ...goal, id };
      state.goals = [
        ...state.goals.filter(
          (g) => !(g.eventId === goal.eventId && g.poolLength === goal.poolLength)
        ),
        saved,
      ];
      return saved;
    },
    async bulkSaveGoals(goals: SwimGoal[]) {
      for (const g of goals) {
        await this.saveGoal(g);
      }
    },
    async deleteGoal(id: number) {
      state.goals = state.goals.filter((g) => g.id !== id);
    },
    async getChatMessages() {
      return [...state.chatMessages];
    },
    async saveChatMessages(messages: ChatMessage[]) {
      state.chatMessages = [...messages];
    },
    async clearAll(resetProfile = false, defaultProfile?: SwimmerProfile) {
      state.marks = [];
      state.goals = [];
      if (resetProfile && defaultProfile) {
        state.profile = defaultProfile;
      }
    },
  };
}

describe('Firebase Client, Repositorios y Migración Aditiva Local-First', () => {
  beforeEach(() => {
    localStorage.clear();
    setFirebaseEnvOverrideForTests(null);
  });

  it('opera en modo no configurado cuando faltan variables VITE_FIREBASE_* sin arrojar errores', () => {
    setFirebaseEnvOverrideForTests({
      VITE_FIREBASE_API_KEY: '',
      VITE_FIREBASE_AUTH_DOMAIN: '',
      VITE_FIREBASE_PROJECT_ID: '',
      VITE_FIREBASE_APP_ID: '',
    });

    expect(isFirebaseConfigured()).toBe(false);
    const client = getFirebaseClient();
    expect(client.isConfigured).toBe(false);
    expect(client.app).toBeNull();
    expect(client.auth).toBeNull();
    expect(client.db).toBeNull();
  });

  it('detecta configuración válida cuando las 4 variables VITE_FIREBASE_* están presentes', () => {
    expect(
      isFirebaseConfigured({
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'split-swim-app.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'split-swim-app',
        VITE_FIREBASE_APP_ID: '1:123456:web:abcdef',
      })
    ).toBe(true);
  });

  it('limpia campos undefined antes de persistir en Firestore y normaliza errores 403 permission-denied', () => {
    const raw = {
      id: 1,
      eventId: '50-fly',
      notes: undefined,
      splits: [{ distance: 25, cumulativeTimeSec: 12.4, strokeCount: undefined }],
    };

    const sanitized = sanitizeForFirestore(raw);
    expect('notes' in sanitized).toBe(false);
    expect('strokeCount' in sanitized.splits[0]).toBe(false);

    const err403 = normalizeFirestoreError({
      code: 'firestore/permission-denied',
      message: 'Missing or insufficient permissions.',
    });
    expect(err403.isPermissionDenied).toBe(true);
    expect(err403.message).toMatch(/acceso denegado a la nube \(403\)/i);
  });

  it('ejecuta migración aditiva e idempotente entre datos locales y Cloud Firestore sin duplicar marcas ni pisar datos remotos', async () => {
    const localMark: SwimMark = {
      id: 1,
      eventId: '50-fly',
      timeSec: 26.8,
      date: '2026-11-01',
      venue: 'CENARD',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-11-01T10:00:00.000Z',
    };

    const remoteExistingMark: SwimMark = {
      id: 1,
      eventId: '100-free',
      timeSec: 55.2,
      date: '2026-10-20',
      venue: 'Parque Olímpico',
      poolLength: 50,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-10-20T10:00:00.000Z',
    };

    const localGoal: SwimGoal = {
      id: 1,
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: 26.0,
      label: 'Meta Local 50 Mariposa',
      updatedAt: '2026-11-05T00:00:00.000Z',
    };

    const localProfile: SwimmerProfile = {
      id: 1,
      name: 'Augusto Hassel',
      gender: 'male',
      club: 'CASI',
      defaultPoolLength: 25,
      favoriteEventIds: ['50-fly', '100-free'],
      updatedAt: '2026-11-05T12:00:00.000Z',
    };

    writeLocalMirror(localProfile, [localMark], [localGoal]);

    const localRepo = createInMemorySwimRepo('local', {
      profile: localProfile,
      marks: [localMark],
      goals: [localGoal],
      chatMessages: [
        {
          id: 'msg-101',
          role: 'user',
          content: '50 mariposa 26.80 en 25m',
          timestamp: '2026-11-01T10:05:00.000Z',
        },
      ],
    });

    const cloudRepo = createInMemorySwimRepo('cloud', {
      profile: null,
      marks: [remoteExistingMark],
      goals: [],
      chatMessages: [],
    });

    const firstMigration = await migrateAndSyncLocalDataToCloud(localRepo, cloudRepo);

    expect(firstMigration.marksUploaded).toBe(1);
    expect(firstMigration.goalsUploaded).toBe(1);
    expect(firstMigration.profileSynced).toBe(true);
    expect(firstMigration.chatMessagesSynced).toBe(1);
    expect(firstMigration.totalMarks).toBe(2);
    expect(cloudRepo.state.marks).toHaveLength(2);
    expect(cloudRepo.state.profile?.name).toBe('Augusto Hassel');

    // Segunda ejecución idempotente: no debe volver a subir ni duplicar marcas
    const secondMigration = await migrateAndSyncLocalDataToCloud(localRepo, cloudRepo);
    expect(secondMigration.marksUploaded).toBe(0);
    expect(secondMigration.goalsUploaded).toBe(0);
    expect(cloudRepo.state.marks).toHaveLength(2);

    expect(buildMarkFingerprint(localMark)).toContain('50-fly|25|2026-11-01|26.80');
    expect(buildGoalKey(localGoal)).toBe('50-fly|25');
  });
});
