import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllData,
  db,
  deleteGoalFromDb,
  deleteMarkFromDb,
  ensureDefaultProfile,
  exportDatabaseAsJson,
  getStoreState,
  importDatabaseFromJson,
  loadDemoDataset,
  readLocalMirror,
  saveGoalToDb,
  saveMarkToDb,
  updateProfileInDb,
} from './index';
import { parseTimeInput } from '../utils/calculator';

// Simular localStorage en entorno Node de Vitest
function createMemoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe('Persistencia Crítica: Guardar Marca, Guardar Objetivo, Guardar Perfil FINA y Borrar Todo', () => {
  beforeEach(async () => {
    const mockStorage = createMemoryLocalStorage();
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockStorage },
      writable: true,
      configurable: true,
    });
    await clearAllData(true);
  });

  it('1. Botón "Registrar Marca": guarda marcas con parciales y tiempos >60s (doble punto) de inmediato y persiste al refrescar', async () => {
    const parsedTime = parseTimeInput('1.02.40');
    expect(parsedTime).toBe(62.4);

    const saved = await saveMarkToDb({
      eventId: '100-fly',
      timeSec: parsedTime!,
      date: '2026-10-13',
      venue: 'CENARD',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [
        { distance: 25, cumulativeTimeSec: 13.4 },
        { distance: 50, cumulativeTimeSec: 28.9 },
        { distance: 75, cumulativeTimeSec: 45.2 },
        { distance: 100, cumulativeTimeSec: 62.4 },
      ],
      feel: 5,
      notes: 'Excelente subacuático',
      createdAt: '2026-10-13T04:00:00Z',
    });

    expect(saved.id).toBe(1);
    expect(saved.timeSec).toBe(62.4);

    // Verificar que al refrescar (readLocalMirror / getStoreState) la marca está persistida
    const mirror = readLocalMirror();
    expect(mirror).not.toBeNull();
    expect(mirror!.marks).toHaveLength(1);
    expect(mirror!.marks[0].eventId).toBe('100-fly');
    expect(mirror!.marks[0].timeSec).toBe(62.4);
    expect(mirror!.marks[0].splits).toHaveLength(4);

    // Verificar actualización de una marca existente
    const updated = await saveMarkToDb(
      {
        ...saved,
        timeSec: 61.85,
      },
      saved.id
    );
    expect(updated.id).toBe(1);
    expect(getStoreState().marks).toHaveLength(1);
    expect(getStoreState().marks[0].timeSec).toBe(61.85);
  });

  it('2. Botón "Guardar Objetivo": guarda y actualiza metas por prueba y pileta de inmediato', async () => {
    const targetSec = parseTimeInput('26.20');
    expect(targetSec).toBe(26.2);

    const goal1 = await saveGoalToDb({
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: targetSec!,
      label: 'Sub-26 Nacional',
      updatedAt: '2026-10-13T04:00:00Z',
    });

    expect(goal1.id).toBe(1);
    expect(getStoreState().goals).toHaveLength(1);
    expect(getStoreState().goals[0].targetTimeSec).toBe(26.2);
    expect(getStoreState().goals[0].label).toBe('Sub-26 Nacional');

    // Si se guarda otro objetivo para la misma prueba y pileta, debe actualizar el existente sin duplicar
    const goal1Updated = await saveGoalToDb({
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: 25.8,
      label: 'Final A',
      updatedAt: '2026-10-13T04:05:00Z',
    });

    expect(goal1Updated.id).toBe(1);
    expect(getStoreState().goals).toHaveLength(1);
    expect(getStoreState().goals[0].targetTimeSec).toBe(25.8);
    expect(getStoreState().goals[0].label).toBe('Final A');

    // Si es otra pileta (50m), se agrega como segundo objetivo
    await saveGoalToDb({
      eventId: '50-fly',
      poolLength: 50,
      targetTimeSec: 26.75,
      updatedAt: '2026-10-13T04:06:00Z',
    });
    expect(getStoreState().goals).toHaveLength(2);
  });

  it('3. Botón "Guardar Perfil y Pruebas Favoritas": persiste nombre, género, pileta, club y pruebas favoritas sin perderse al refrescar', async () => {
    const savedProfile = await updateProfileInDb({
      id: 1,
      name: 'Augusto',
      gender: 'male',
      category: 'Master',
      club: 'River Plate',
      defaultPoolLength: 50,
      favoriteEventIds: ['50-fly', '100-fly', '50-free'],
      updatedAt: '2026-10-13T04:00:00Z',
    });

    expect(savedProfile.name).toBe('Augusto');
    expect(savedProfile.defaultPoolLength).toBe(50);
    expect(savedProfile.favoriteEventIds).toEqual(['50-fly', '100-fly', '50-free']);

    // Simular recarga de la aplicación llamando a ensureDefaultProfile()
    const hydratedProfile = await ensureDefaultProfile();
    expect(hydratedProfile.name).toBe('Augusto');
    expect(hydratedProfile.club).toBe('River Plate');
    expect(hydratedProfile.defaultPoolLength).toBe(50);
    expect(hydratedProfile.favoriteEventIds).toEqual(['50-fly', '100-fly', '50-free']);
  });

  it('4. Botón "Sí, borrar ahora": vacía todas las marcas y objetivos al instante (y opcionalmente restablece el perfil)', async () => {
    await updateProfileInDb({
      id: 1,
      name: 'Augusto',
      gender: 'male',
      defaultPoolLength: 50,
      favoriteEventIds: ['100-fly'],
      updatedAt: '2026-10-13T04:00:00Z',
    });
    await loadDemoDataset();
    expect(getStoreState().marks.length).toBeGreaterThan(0);
    expect(getStoreState().goals.length).toBeGreaterThan(0);

    // Borrar solo marcas y objetivos manteniendo el perfil
    await clearAllData(false);
    expect(getStoreState().marks).toHaveLength(0);
    expect(getStoreState().goals).toHaveLength(0);
    expect(getStoreState().profile.name).toBe('Augusto');

    // Borrar todo y restablecer perfil de fábrica
    await clearAllData(true);
    expect(getStoreState().marks).toHaveLength(0);
    expect(getStoreState().goals).toHaveLength(0);
    expect(getStoreState().profile.name).toBe('Nadador');
  });

  it('5. Resiliencia Móvil Crítica: NINGÚN botón se cuelga aunque IndexedDB quede bloqueado indefinidamente en el celular', async () => {
    // Simular el bloqueo infinito de IndexedDB en iOS Safari / Android PWA (promesa que nunca resuelve)
    const neverEndingPromise = () => new Promise<never>(() => {});
    const spyMarkPut = vi.spyOn(db.marks, 'put').mockImplementation(neverEndingPromise as never);
    const spyMarkDel = vi.spyOn(db.marks, 'delete').mockImplementation(neverEndingPromise as never);
    const spyGoalPut = vi.spyOn(db.goals, 'put').mockImplementation(neverEndingPromise as never);
    const spyGoalDel = vi.spyOn(db.goals, 'delete').mockImplementation(neverEndingPromise as never);
    const spyProfPut = vi.spyOn(db.profile, 'put').mockImplementation(neverEndingPromise as never);
    const spyTx = vi.spyOn(db, 'transaction').mockImplementation(neverEndingPromise as never);

    try {
      const start = Date.now();

      // 1) Guardar Perfil FINA no debe bloquearse jamás
      const prof = await updateProfileInDb({
        id: 1,
        name: 'Nadador Móvil',
        gender: 'female',
        defaultPoolLength: 25,
        favoriteEventIds: ['50-fly', '100-free'],
        updatedAt: new Date().toISOString(),
      });
      expect(prof.name).toBe('Nadador Móvil');

      // 2) Registrar Marca no debe bloquearse jamás
      const mark = await saveMarkToDb({
        eventId: '50-fly',
        timeSec: 26.45,
        date: '2026-10-13',
        venue: 'Club',
        poolLength: 25,
        context: 'race',
        modality: 'individual',
        timing: 'manual',
        splits: [],
        createdAt: new Date().toISOString(),
      });
      expect(mark.id).toBe(1);
      expect(getStoreState().marks).toHaveLength(1);

      // 3) Guardar Objetivo no debe bloquearse jamás
      const goal = await saveGoalToDb({
        eventId: '50-fly',
        poolLength: 25,
        targetTimeSec: 25.99,
        updatedAt: new Date().toISOString(),
      });
      expect(goal.id).toBe(1);
      expect(getStoreState().goals).toHaveLength(1);

      // 4) Exportar e Importar JSON no deben bloquearse jamás
      const backupJson = await exportDatabaseAsJson();
      expect(backupJson).toContain('Nadador Móvil');

      // 5) Eliminar marca, eliminar objetivo y "Sí, borrar ahora" no deben bloquearse jamás
      await deleteMarkFromDb(mark.id!);
      expect(getStoreState().marks).toHaveLength(0);

      await deleteGoalFromDb(goal.id!);
      expect(getStoreState().goals).toHaveLength(0);

      await importDatabaseFromJson(backupJson);
      expect(getStoreState().marks).toHaveLength(1);
      expect(getStoreState().goals).toHaveLength(1);

      await clearAllData(true);
      expect(getStoreState().marks).toHaveLength(0);
      expect(getStoreState().goals).toHaveLength(0);

      const elapsedMs = Date.now() - start;
      // Todas las operaciones combinadas deben resolverse en menos de 100ms sin esperar a IndexedDB
      expect(elapsedMs).toBeLessThan(100);
    } finally {
      spyMarkPut.mockRestore();
      spyMarkDel.mockRestore();
      spyGoalPut.mockRestore();
      spyGoalDel.mockRestore();
      spyProfPut.mockRestore();
      spyTx.mockRestore();
    }
  });
});

