import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { ChatMessage, SwimGoal, SwimMark, SwimmerProfile } from '../../types';
import { DEFAULT_SWIMMER_PROFILE } from '../seeds';
import {
  ISwimRepository,
  SwimRepositoryError,
  SwimRepositorySnapshot,
  SwimRepositorySubscriptionCallbacks,
} from './swim-repository.interface';

export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return value;
}

export function normalizeFirestoreError(err: unknown): SwimRepositoryError {
  const rawCode =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : 'unknown';
  const rawMessage =
    err instanceof Error ? err.message : 'Error de sincronización con Cloud Firestore.';
  const isPermissionDenied =
    rawCode.includes('permission-denied') ||
    rawCode.includes('unauthenticated') ||
    rawMessage.toLowerCase().includes('permission_denied') ||
    rawMessage.toLowerCase().includes('missing or insufficient permissions');

  return {
    code: rawCode,
    message: isPermissionDenied
      ? 'Acceso denegado a la nube (403). Tus datos siguen disponibles y protegidos en este dispositivo.'
      : rawMessage,
    isPermissionDenied,
  };
}

export class FirestoreSwimRepository implements ISwimRepository {
  readonly mode = 'cloud' as const;

  constructor(
    private readonly firestore: Firestore,
    private readonly uid: string,
    private readonly onErrorCallback?: (error: SwimRepositoryError) => void
  ) {}

  private handleError(err: unknown): never {
    const normalized = normalizeFirestoreError(err);
    this.onErrorCallback?.(normalized);
    throw err;
  }

  private userDocRef() {
    return doc(this.firestore, 'users', this.uid);
  }

  private profileDocRef() {
    return doc(this.firestore, 'users', this.uid, 'profile', 'main');
  }

  private marksColRef() {
    return collection(this.firestore, 'users', this.uid, 'marks');
  }

  private markDocRef(id: number) {
    return doc(this.firestore, 'users', this.uid, 'marks', String(id));
  }

  private goalsColRef() {
    return collection(this.firestore, 'users', this.uid, 'goals');
  }

  private goalDocRef(id: number) {
    return doc(this.firestore, 'users', this.uid, 'goals', String(id));
  }

  private chatMessagesColRef() {
    return collection(this.firestore, 'users', this.uid, 'chatMessages');
  }

  private chatMessageDocRef(id: string) {
    return doc(this.firestore, 'users', this.uid, 'chatMessages', id);
  }

  private async touchUserRootDoc(): Promise<void> {
    try {
      await setDoc(
        this.userDocRef(),
        {
          uid: this.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {
      // No bloquear operaciones de subcolección si el toque de metadatos falla
    }
  }

  async getProfile(): Promise<SwimmerProfile | null> {
    try {
      const snap = await getDoc(this.profileDocRef());
      if (!snap.exists()) return null;
      const data = snap.data() as SwimmerProfile;
      return {
        ...DEFAULT_SWIMMER_PROFILE,
        ...data,
        id: 1,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async saveProfile(profile: SwimmerProfile): Promise<SwimmerProfile> {
    try {
      const canonical: SwimmerProfile = sanitizeForFirestore({
        ...DEFAULT_SWIMMER_PROFILE,
        ...profile,
        id: 1,
        name: profile.name?.trim() || 'Nadador',
        favoriteEventIds:
          profile.favoriteEventIds && profile.favoriteEventIds.length > 0
            ? profile.favoriteEventIds
            : ['50-fly'],
        updatedAt: profile.updatedAt || new Date().toISOString(),
      });
      await this.touchUserRootDoc();
      await setDoc(this.profileDocRef(), canonical, { merge: true });
      return canonical;
    } catch (err) {
      this.handleError(err);
    }
  }

  async getMarks(): Promise<SwimMark[]> {
    try {
      const snap = await getDocs(this.marksColRef());
      return snap.docs.map((d) => {
        const data = d.data() as SwimMark;
        const parsedId = Number(d.id);
        return {
          ...data,
          id: data.id ?? (Number.isFinite(parsedId) ? parsedId : 1),
          splits: Array.isArray(data.splits) ? data.splits : [],
        };
      });
    } catch (err) {
      this.handleError(err);
    }
  }

  async saveMark(mark: SwimMark): Promise<SwimMark> {
    try {
      const id = mark.id ?? Date.now();
      const payload: SwimMark = sanitizeForFirestore({
        ...mark,
        id,
        splits: Array.isArray(mark.splits) ? mark.splits : [],
      });
      await this.touchUserRootDoc();
      await setDoc(this.markDocRef(id), payload);
      return payload;
    } catch (err) {
      this.handleError(err);
    }
  }

  async bulkSaveMarks(marks: SwimMark[]): Promise<void> {
    if (marks.length === 0) return;
    try {
      await this.touchUserRootDoc();
      const batch = writeBatch(this.firestore);
      for (const mark of marks) {
        const id = mark.id ?? Date.now();
        const payload = sanitizeForFirestore({
          ...mark,
          id,
          splits: Array.isArray(mark.splits) ? mark.splits : [],
        });
        batch.set(this.markDocRef(id), payload);
      }
      await batch.commit();
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteMark(id: number): Promise<void> {
    try {
      await deleteDoc(this.markDocRef(id));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getGoals(): Promise<SwimGoal[]> {
    try {
      const snap = await getDocs(this.goalsColRef());
      return snap.docs.map((d) => {
        const data = d.data() as SwimGoal;
        const parsedId = Number(d.id);
        return {
          ...data,
          id: data.id ?? (Number.isFinite(parsedId) ? parsedId : 1),
        };
      });
    } catch (err) {
      this.handleError(err);
    }
  }

  async saveGoal(goal: SwimGoal): Promise<SwimGoal> {
    try {
      const id = goal.id ?? Date.now();
      const payload: SwimGoal = sanitizeForFirestore({
        ...goal,
        id,
      });
      await this.touchUserRootDoc();
      await setDoc(this.goalDocRef(id), payload);
      return payload;
    } catch (err) {
      this.handleError(err);
    }
  }

  async bulkSaveGoals(goals: SwimGoal[]): Promise<void> {
    if (goals.length === 0) return;
    try {
      await this.touchUserRootDoc();
      const batch = writeBatch(this.firestore);
      for (const goal of goals) {
        const id = goal.id ?? Date.now();
        const payload = sanitizeForFirestore({
          ...goal,
          id,
        });
        batch.set(this.goalDocRef(id), payload);
      }
      await batch.commit();
    } catch (err) {
      this.handleError(err);
    }
  }

  async deleteGoal(id: number): Promise<void> {
    try {
      await deleteDoc(this.goalDocRef(id));
    } catch (err) {
      this.handleError(err);
    }
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    try {
      const snap = await getDocs(this.chatMessagesColRef());
      const items = snap.docs.map((d) => d.data() as ChatMessage);
      return items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (err) {
      this.handleError(err);
    }
  }

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    try {
      await this.touchUserRootDoc();
      const existingSnap = await getDocs(this.chatMessagesColRef());
      const nextIds = new Set(messages.map((m) => m.id));
      const batch = writeBatch(this.firestore);

      for (const existingDoc of existingSnap.docs) {
        if (!nextIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
        }
      }

      for (const msg of messages) {
        batch.set(this.chatMessageDocRef(msg.id), sanitizeForFirestore(msg));
      }

      await batch.commit();
    } catch (err) {
      this.handleError(err);
    }
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
    try {
      const [marksSnap, goalsSnap] = await Promise.all([
        getDocs(this.marksColRef()),
        getDocs(this.goalsColRef()),
      ]);
      const batch = writeBatch(this.firestore);
      for (const docSnap of marksSnap.docs) {
        batch.delete(docSnap.ref);
      }
      for (const docSnap of goalsSnap.docs) {
        batch.delete(docSnap.ref);
      }
      if (resetProfile && defaultProfile) {
        batch.set(this.profileDocRef(), sanitizeForFirestore(defaultProfile));
      }
      await batch.commit();
    } catch (err) {
      this.handleError(err);
    }
  }

  subscribe(callbacks: SwimRepositorySubscriptionCallbacks): () => void {
    const handleSnapshotError = (err: unknown) => {
      const normalized = normalizeFirestoreError(err);
      this.onErrorCallback?.(normalized);
      callbacks.onError?.(normalized);
    };

    const unsubProfile = onSnapshot(
      this.profileDocRef(),
      (snap) => {
        if (snap.exists() && callbacks.onProfileChange) {
          const data = snap.data() as SwimmerProfile;
          callbacks.onProfileChange({
            ...DEFAULT_SWIMMER_PROFILE,
            ...data,
            id: 1,
          });
        }
      },
      handleSnapshotError
    );

    const unsubMarks = onSnapshot(
      this.marksColRef(),
      (snap) => {
        if (callbacks.onMarksChange) {
          const marks = snap.docs.map((d) => {
            const data = d.data() as SwimMark;
            const parsedId = Number(d.id);
            return {
              ...data,
              id: data.id ?? (Number.isFinite(parsedId) ? parsedId : 1),
              splits: Array.isArray(data.splits) ? data.splits : [],
            };
          });
          callbacks.onMarksChange(marks);
        }
      },
      handleSnapshotError
    );

    const unsubGoals = onSnapshot(
      this.goalsColRef(),
      (snap) => {
        if (callbacks.onGoalsChange) {
          const goals = snap.docs.map((d) => {
            const data = d.data() as SwimGoal;
            const parsedId = Number(d.id);
            return {
              ...data,
              id: data.id ?? (Number.isFinite(parsedId) ? parsedId : 1),
            };
          });
          callbacks.onGoalsChange(goals);
        }
      },
      handleSnapshotError
    );

    const unsubChat = onSnapshot(
      this.chatMessagesColRef(),
      (snap) => {
        if (callbacks.onChatMessagesChange) {
          const items = snap.docs
            .map((d) => d.data() as ChatMessage)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          callbacks.onChatMessagesChange(items);
        }
      },
      handleSnapshotError
    );

    return () => {
      unsubProfile();
      unsubMarks();
      unsubGoals();
      unsubChat();
    };
  }
}
