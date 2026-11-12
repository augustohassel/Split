import { ChatMessage, SwimGoal, SwimMark, SwimmerProfile } from '../types';
import {
  getChatMessagesFromStore,
  getStoreState,
  isCustomProfile,
  saveChatMessagesToDb,
  writeLocalMirror,
} from '../db';
import { DEFAULT_SWIMMER_PROFILE } from '../db/seeds';
import { ISwimRepository } from '../db/repositories/swim-repository.interface';

export interface CloudMigrationResult {
  marksUploaded: number;
  goalsUploaded: number;
  profileSynced: boolean;
  chatMessagesSynced: number;
  totalMarks: number;
  totalGoals: number;
}

export function buildMarkFingerprint(mark: SwimMark): string {
  return [
    mark.eventId,
    mark.poolLength,
    mark.date,
    Number(mark.timeSec).toFixed(2),
    mark.context,
    mark.modality,
  ].join('|');
}

export function buildGoalKey(goal: SwimGoal): string {
  return `${goal.eventId}|${goal.poolLength}`;
}

function mergeMarksList(primary: SwimMark[], secondary: SwimMark[]): SwimMark[] {
  const seenFingerprints = new Set<string>();
  const merged: SwimMark[] = [];

  for (const m of [...primary, ...secondary]) {
    const fp = buildMarkFingerprint(m);
    if (!seenFingerprints.has(fp)) {
      seenFingerprints.add(fp);
      merged.push(m);
    }
  }
  return merged;
}

function mergeGoalsList(primary: SwimGoal[], secondary: SwimGoal[]): SwimGoal[] {
  const byKey = new Map<string, SwimGoal>();
  for (const g of [...primary, ...secondary]) {
    const key = buildGoalKey(g);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, g);
    } else if ((g.updatedAt || '') > (existing.updatedAt || '')) {
      byKey.set(key, g);
    }
  }
  return Array.from(byKey.values());
}

function mergeChatMessages(localMessages: ChatMessage[], remoteMessages: ChatMessage[]): {
  merged: ChatMessage[];
  toUpload: ChatMessage[];
} {
  const byId = new Map<string, ChatMessage>();
  for (const msg of remoteMessages) {
    byId.set(msg.id, msg);
  }

  const toUpload: ChatMessage[] = [];
  for (const msg of localMessages) {
    if (msg.id === 'welcome-msg' && remoteMessages.length > 0) {
      continue;
    }
    if (!byId.has(msg.id)) {
      byId.set(msg.id, msg);
      toUpload.push(msg);
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  return { merged, toUpload };
}

/**
 * Ejecuta una migración aditiva e idempotente entre los datos locales (Dexie + LocalMirror)
 * y Cloud Firestore para el usuario autenticado, sin pisar ni duplicar destructivamente.
 */
export async function migrateAndSyncLocalDataToCloud(
  localRepo: ISwimRepository,
  cloudRepo: ISwimRepository
): Promise<CloudMigrationResult> {
  const mirror = getStoreState();
  const [localSnapshot, remoteSnapshot] = await Promise.all([
    localRepo.getSnapshot(),
    cloudRepo.getSnapshot(),
  ]);

  const localMarks = mergeMarksList(mirror.marks, localSnapshot.marks);
  const localGoals = mergeGoalsList(mirror.goals, localSnapshot.goals);
  const localProfile = isCustomProfile(mirror.profile)
    ? mirror.profile
    : localSnapshot.profile ?? mirror.profile;
  const localChat =
    localSnapshot.chatMessages.length > 0
      ? localSnapshot.chatMessages
      : getChatMessagesFromStore();

  // 1. Fusión de Perfil
  let finalProfile: SwimmerProfile;
  let shouldUploadProfile = false;

  if (!remoteSnapshot.profile) {
    finalProfile = {
      ...DEFAULT_SWIMMER_PROFILE,
      ...localProfile,
      id: 1,
      updatedAt: localProfile?.updatedAt || new Date().toISOString(),
    };
    shouldUploadProfile = true;
  } else if (
    isCustomProfile(localProfile) &&
    !isCustomProfile(remoteSnapshot.profile)
  ) {
    finalProfile = {
      ...DEFAULT_SWIMMER_PROFILE,
      ...localProfile,
      id: 1,
      updatedAt: new Date().toISOString(),
    };
    shouldUploadProfile = true;
  } else if (
    isCustomProfile(localProfile) &&
    (localProfile.updatedAt || '') > (remoteSnapshot.profile.updatedAt || '')
  ) {
    finalProfile = {
      ...DEFAULT_SWIMMER_PROFILE,
      ...localProfile,
      id: 1,
    };
    shouldUploadProfile = true;
  } else {
    finalProfile = {
      ...DEFAULT_SWIMMER_PROFILE,
      ...remoteSnapshot.profile,
      id: 1,
    };
  }

  if (shouldUploadProfile) {
    await cloudRepo.saveProfile(finalProfile);
  }

  // 2. Fusión aditiva de Marcas
  const remoteFingerprints = new Set(remoteSnapshot.marks.map(buildMarkFingerprint));
  const usedMarkIds = new Set<number>(
    remoteSnapshot.marks
      .map((m) => m.id)
      .filter((id): id is number => typeof id === 'number')
  );
  let nextMarkId =
    remoteSnapshot.marks.reduce(
      (max, m) => Math.max(max, typeof m.id === 'number' ? m.id : 0),
      0
    ) + 1;

  const marksToUpload: SwimMark[] = [];
  for (const localMark of localMarks) {
    const fp = buildMarkFingerprint(localMark);
    if (!remoteFingerprints.has(fp)) {
      remoteFingerprints.add(fp);
      let assignedId = localMark.id;
      if (assignedId === undefined || usedMarkIds.has(assignedId)) {
        while (usedMarkIds.has(nextMarkId)) {
          nextMarkId += 1;
        }
        assignedId = nextMarkId;
      }
      usedMarkIds.add(assignedId);
      marksToUpload.push({
        ...localMark,
        id: assignedId,
        splits: Array.isArray(localMark.splits) ? localMark.splits : [],
      });
    }
  }

  if (marksToUpload.length > 0) {
    await cloudRepo.bulkSaveMarks(marksToUpload);
  }

  const finalMarks = [...remoteSnapshot.marks, ...marksToUpload];

  // 3. Fusión aditiva de Objetivos
  const remoteGoalsByKey = new Map<string, SwimGoal>();
  const usedGoalIds = new Set<number>();
  let nextGoalId = 1;

  for (const rg of remoteSnapshot.goals) {
    remoteGoalsByKey.set(buildGoalKey(rg), rg);
    if (typeof rg.id === 'number') {
      usedGoalIds.add(rg.id);
      nextGoalId = Math.max(nextGoalId, rg.id + 1);
    }
  }

  const goalsToUpload: SwimGoal[] = [];
  for (const lg of localGoals) {
    const key = buildGoalKey(lg);
    const existingRemote = remoteGoalsByKey.get(key);
    if (!existingRemote) {
      let assignedId = lg.id;
      if (assignedId === undefined || usedGoalIds.has(assignedId)) {
        while (usedGoalIds.has(nextGoalId)) {
          nextGoalId += 1;
        }
        assignedId = nextGoalId;
      }
      usedGoalIds.add(assignedId);
      const goalWithId: SwimGoal = { ...lg, id: assignedId };
      remoteGoalsByKey.set(key, goalWithId);
      goalsToUpload.push(goalWithId);
    } else if ((lg.updatedAt || '') > (existingRemote.updatedAt || '')) {
      const updatedGoal: SwimGoal = {
        ...lg,
        id: existingRemote.id ?? lg.id ?? nextGoalId++,
      };
      remoteGoalsByKey.set(key, updatedGoal);
      goalsToUpload.push(updatedGoal);
    }
  }

  if (goalsToUpload.length > 0) {
    await cloudRepo.bulkSaveGoals(goalsToUpload);
  }

  const finalGoals = Array.from(remoteGoalsByKey.values());

  // 4. Fusión aditiva de Mensajes de Chat
  const { merged: finalChatMessages, toUpload: chatToUpload } = mergeChatMessages(
    localChat,
    remoteSnapshot.chatMessages
  );

  if (chatToUpload.length > 0) {
    await cloudRepo.saveChatMessages(finalChatMessages);
  }

  // 5. Actualizar espejo local y Dexie con el estado unificado
  writeLocalMirror(finalProfile, finalMarks, finalGoals);
  await localRepo.saveProfile(finalProfile);
  if (finalMarks.length > 0) {
    await localRepo.bulkSaveMarks(finalMarks);
  }
  if (finalGoals.length > 0) {
    await localRepo.bulkSaveGoals(finalGoals);
  }
  if (finalChatMessages.length > 0) {
    await saveChatMessagesToDb(finalChatMessages, { skipCloudSync: true });
  }

  return {
    marksUploaded: marksToUpload.length,
    goalsUploaded: goalsToUpload.length,
    profileSynced: shouldUploadProfile,
    chatMessagesSynced: chatToUpload.length,
    totalMarks: finalMarks.length,
    totalGoals: finalGoals.length,
  };
}
