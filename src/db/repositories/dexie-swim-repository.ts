import Dexie, { Table } from 'dexie';
import { ChatMessage, SwimGoal, SwimMark, SwimmerProfile } from '../../types';
import { DEFAULT_SWIMMER_PROFILE } from '../seeds';
import {
  ISwimRepository,
  SwimRepositorySnapshot,
  SwimRepositorySubscriptionCallbacks,
} from './swim-repository.interface';

export const CHAT_STORAGE_KEY = 'split_chat_messages_v1';

export type DexieTablesLike = Dexie & {
  profile: Table<SwimmerProfile, number>;
  marks: Table<SwimMark, number>;
  goals: Table<SwimGoal, number>;
};

export function isCustomProfile(p?: SwimmerProfile | null): boolean {
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

export function readChatMessagesFromLocalStorage(): ChatMessage[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function writeChatMessagesToLocalStorage(messages: ChatMessage[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignorar errores de cuota de localStorage
  }
}

export class DexieSwimRepository implements ISwimRepository {
  readonly mode = 'local' as const;

  constructor(private readonly database: DexieTablesLike) {}

  async getProfile(): Promise<SwimmerProfile | null> {
    try {
      const allProfiles = await this.database.profile.toArray();
      if (allProfiles.length === 0) return null;
      return (
        allProfiles.find((p) => isCustomProfile(p)) ??
        allProfiles[allProfiles.length - 1] ??
        null
      );
    } catch {
      return null;
    }
  }

  async saveProfile(profile: SwimmerProfile): Promise<SwimmerProfile> {
    const canonical: SwimmerProfile = {
      ...DEFAULT_SWIMMER_PROFILE,
      ...profile,
      id: 1,
      name: profile.name?.trim() || 'Nadador',
      favoriteEventIds:
        profile.favoriteEventIds && profile.favoriteEventIds.length > 0
          ? profile.favoriteEventIds
          : ['50-fly'],
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };
    await this.database.profile.put(canonical);
    return canonical;
  }

  async getMarks(): Promise<SwimMark[]> {
    try {
      return await this.database.marks.toArray();
    } catch {
      return [];
    }
  }

  async saveMark(mark: SwimMark): Promise<SwimMark> {
    const id = await this.database.marks.put(mark);
    return { ...mark, id: mark.id ?? id };
  }

  async bulkSaveMarks(marks: SwimMark[]): Promise<void> {
    if (marks.length === 0) return;
    await this.database.marks.bulkPut(marks);
  }

  async deleteMark(id: number): Promise<void> {
    await this.database.marks.delete(id);
  }

  async getGoals(): Promise<SwimGoal[]> {
    try {
      return await this.database.goals.toArray();
    } catch {
      return [];
    }
  }

  async saveGoal(goal: SwimGoal): Promise<SwimGoal> {
    const id = await this.database.goals.put(goal);
    return { ...goal, id: goal.id ?? id };
  }

  async bulkSaveGoals(goals: SwimGoal[]): Promise<void> {
    if (goals.length === 0) return;
    await this.database.goals.bulkPut(goals);
  }

  async deleteGoal(id: number): Promise<void> {
    await this.database.goals.delete(id);
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return readChatMessagesFromLocalStorage();
  }

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    writeChatMessagesToLocalStorage(messages);
  }

  async getSnapshot(): Promise<SwimRepositorySnapshot> {
    const [profile, marks, goals, chatMessages] = await Promise.all([
      this.getProfile(),
      this.getMarks(),
      this.getGoals(),
      this.getChatMessages(),
    ]);
    return {
      profile,
      marks,
      goals,
      chatMessages,
    };
  }

  async clearAll(resetProfile = false, defaultProfile?: SwimmerProfile): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.profile,
      this.database.marks,
      this.database.goals,
      async () => {
        await this.database.marks.clear();
        await this.database.goals.clear();
        if (resetProfile && defaultProfile) {
          await this.database.profile.put(defaultProfile);
        }
      }
    );
  }

  subscribe(_callbacks: SwimRepositorySubscriptionCallbacks): () => void {
    void _callbacks;
    return () => {};
  }
}
