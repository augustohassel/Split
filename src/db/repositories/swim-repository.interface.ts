import { ChatMessage, SwimGoal, SwimMark, SwimmerProfile } from '../../types';

export interface SwimRepositorySnapshot {
  profile: SwimmerProfile | null;
  marks: SwimMark[];
  goals: SwimGoal[];
  chatMessages: ChatMessage[];
}

export interface SwimRepositoryError {
  code: string;
  message: string;
  isPermissionDenied: boolean;
}

export interface SwimRepositorySubscriptionCallbacks {
  onProfileChange?: (profile: SwimmerProfile) => void;
  onMarksChange?: (marks: SwimMark[]) => void;
  onGoalsChange?: (goals: SwimGoal[]) => void;
  onChatMessagesChange?: (messages: ChatMessage[]) => void;
  onError?: (error: SwimRepositoryError) => void;
}

export interface ISwimRepository {
  readonly mode: 'local' | 'cloud';
  getSnapshot(): Promise<SwimRepositorySnapshot>;
  getProfile(): Promise<SwimmerProfile | null>;
  saveProfile(profile: SwimmerProfile): Promise<SwimmerProfile>;
  getMarks(): Promise<SwimMark[]>;
  saveMark(mark: SwimMark): Promise<SwimMark>;
  bulkSaveMarks(marks: SwimMark[]): Promise<void>;
  deleteMark(id: number): Promise<void>;
  getGoals(): Promise<SwimGoal[]>;
  saveGoal(goal: SwimGoal): Promise<SwimGoal>;
  bulkSaveGoals(goals: SwimGoal[]): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  getChatMessages(): Promise<ChatMessage[]>;
  saveChatMessages(messages: ChatMessage[]): Promise<void>;
  clearAll(resetProfile?: boolean, defaultProfile?: SwimmerProfile): Promise<void>;
  subscribe?(callbacks: SwimRepositorySubscriptionCallbacks): () => void;
}
