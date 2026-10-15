import {
  AiSettings,
  ChatMessage,
  DraftGoalData,
  DraftMarkData,
  SwimGoal,
  SwimmerProfile,
} from '../types';
import { getAiSettings } from './aiSettings';
import { buildSwimSystemPrompt } from './prompts/swimSystemPrompt';
import { SWIM_EVENTS } from '../utils/events';

export const MAX_CONTEXT_MESSAGES = 8;

/**
 * Extrae y separa los bloques JSON de borrador (draftMark o draftGoal) de la respuesta del LLM
 */
export function extractDraftFromResponse(rawText: string): {
  text: string;
  cleanText: string;
  draftMark?: DraftMarkData;
  draftGoal?: DraftGoalData;
} {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = rawText.match(jsonBlockRegex);

  if (!match) {
    return { text: rawText, cleanText: rawText };
  }

  try {
    const parsed = JSON.parse(match[1]);

    let draftMark: DraftMarkData | undefined = undefined;
    let draftGoal: DraftGoalData | undefined = undefined;

    if (parsed && parsed.draftMark) {
      const m = parsed.draftMark;
      const validEvent = SWIM_EVENTS.find((e) => e.id === m.eventId);
      if (validEvent && typeof m.timeSec === 'number' && m.timeSec > 0) {
        const pool = m.poolLength === 50 && validEvent.id !== '100-medley' ? 50 : 25;
        draftMark = {
          eventId: validEvent.id,
          timeSec: Math.round(m.timeSec * 100) / 100,
          poolLength: pool,
          date: typeof m.date === 'string' && m.date ? m.date : new Date().toISOString().slice(0, 10),
          venue: typeof m.venue === 'string' ? m.venue : 'Pileta habitual',
          context: m.context === 'training' ? 'training' : 'race',
          modality: m.modality === 'relay_lead' || m.modality === 'relay_flying' ? m.modality : 'individual',
          timing: m.timing === 'manual' ? 'manual' : 'electronic',
          feel: typeof m.feel === 'number' && m.feel >= 1 && m.feel <= 5 ? (m.feel as DraftMarkData['feel']) : undefined,
          notes: typeof m.notes === 'string' ? m.notes : undefined,
          confirmed: false,
        };
      }
    } else if (parsed && parsed.draftGoal) {
      const g = parsed.draftGoal;
      const validEvent = SWIM_EVENTS.find((e) => e.id === g.eventId);
      if (validEvent && typeof g.targetTimeSec === 'number' && g.targetTimeSec > 0) {
        const pool = g.poolLength === 50 && validEvent.id !== '100-medley' ? 50 : 25;
        draftGoal = {
          eventId: validEvent.id,
          poolLength: pool,
          targetTimeSec: Math.round(g.targetTimeSec * 100) / 100,
          label: typeof g.label === 'string' ? g.label : 'Meta',
          confirmed: false,
        };
      }
    }

    const cleanText = rawText.replace(match[0], '').trim();
    const finalClean = cleanText || rawText;
    return { text: finalClean, cleanText: finalClean, draftMark, draftGoal };
  } catch {
    return { text: rawText, cleanText: rawText };
  }
}

/**
 * Envía el mensaje al proveedor de IA configurado aplicando una ventana deslizante de tokens
 */
export async function sendChatMessage(
  history: ChatMessage[],
  newMessage: string,
  profile: SwimmerProfile,
  goals: SwimGoal[] = [],
  customSettings?: AiSettings
): Promise<{ text: string; draftMark?: DraftMarkData; draftGoal?: DraftGoalData }> {
  const settings = customSettings || getAiSettings();

  if (!settings.apiKey && settings.provider !== 'openai') {
    throw new Error('No has configurado una API Key de IA. Ve a Ajustes > Asistente Conversacional para activarlo.');
  }

  const systemPrompt = buildSwimSystemPrompt(profile, goals);

  // Ventana deslizante (Sliding Window): acotar a los últimos N mensajes para ahorrar tokens
  const trimmedHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_CONTEXT_MESSAGES);

  if (settings.provider === 'gemini') {
    return callGemini(settings, systemPrompt, trimmedHistory, newMessage);
  } else {
    return callOpenAI(settings, systemPrompt, trimmedHistory, newMessage);
  }
}

/**
 * Llamada directa a Google Gemini (v1beta REST API con CORS)
 */
async function callGemini(
  settings: AiSettings,
  systemPrompt: string,
  history: ChatMessage[],
  newMessage: string
): Promise<{ text: string; draftMark?: DraftMarkData; draftGoal?: DraftGoalData }> {
  const model = settings.modelName.trim() || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey.trim()}`;

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: newMessage }],
    },
  ];

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetail = `Error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Ignorar
    }
    throw new Error(`Google Gemini: ${errorDetail}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No obtuve respuesta.';

  return extractDraftFromResponse(rawText);
}

/**
 * Llamada directa a OpenAI o endpoint compatible (Ollama, vLLM, LM Studio)
 */
async function callOpenAI(
  settings: AiSettings,
  systemPrompt: string,
  history: ChatMessage[],
  newMessage: string
): Promise<{ text: string; draftMark?: DraftMarkData; draftGoal?: DraftGoalData }> {
  let baseUrl = settings.baseUrl?.trim() || 'https://api.openai.com/v1';
  baseUrl = baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: newMessage },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
  }

  const model = settings.modelName.trim() || 'gpt-4o-mini';

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    let errorDetail = `Error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Ignorar
    }
    throw new Error(`Proveedor OpenAI: ${errorDetail}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || 'No obtuve respuesta.';

  return extractDraftFromResponse(rawText);
}

/**
 * Prueba la conectividad con el proveedor de IA configurado
 */
export async function testAiConnection(
  settings: AiSettings
): Promise<{ success: boolean; message: string }> {
  try {
    if (settings.provider === 'gemini') {
      if (!settings.apiKey.trim()) {
        return { success: false, message: 'La API Key de Gemini es requerida.' };
      }
      const model = settings.modelName.trim() || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responde "OK".' }] }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.error?.message || `HTTP ${res.status}` };
      }
      return { success: true, message: '¡Conexión con Google Gemini validada exitosamente!' };
    } else {
      let baseUrl = settings.baseUrl?.trim() || 'https://api.openai.com/v1';
      baseUrl = baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/chat/completions`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (settings.apiKey?.trim()) {
        headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
      }
      const model = settings.modelName.trim() || 'gpt-4o-mini';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Responde "OK"' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.error?.message || `HTTP ${res.status}` };
      }
      return { success: true, message: '¡Conexión con OpenAI / Endpoint validada exitosamente!' };
    }
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || 'Error de red o CORS al contactar el proveedor.',
    };
  }
}

