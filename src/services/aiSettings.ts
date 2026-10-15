import { AiSettings } from '../types';

const STORAGE_KEY = 'split_ai_settings_v1';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'gemini',
  apiKey: '',
  modelName: 'gemini-1.5-flash',
  baseUrl: '',
};

export function getAiSettings(): AiSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_AI_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignorar errores de cuota
  }
}

