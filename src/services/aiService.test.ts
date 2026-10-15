import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractDraftFromResponse, sendChatMessage, testAiConnection } from './aiService';
import { SwimmerProfile } from '../types';

describe('aiService - extractDraftFromResponse', () => {
  it('extrae una marca (draftMark) válida desde un bloque JSON', () => {
    const raw = `¡Excelente registro! Has bajado tu marca en mariposa.
\`\`\`json
{
  "draftMark": {
    "eventId": "100-fly",
    "timeSec": 62.15,
    "poolLength": 25,
    "date": "2026-10-15",
    "venue": "CENARD",
    "context": "race",
    "feel": 4,
    "notes": "Viraje rápido"
  }
}
\`\`\`
¿Quieres guardarla en tu historial?`;

    const { cleanText, draftMark, draftGoal } = extractDraftFromResponse(raw);

    expect(draftMark).toBeDefined();
    expect(draftGoal).toBeUndefined();
    expect(draftMark?.eventId).toBe('100-fly');
    expect(draftMark?.timeSec).toBe(62.15);
    expect(draftMark?.poolLength).toBe(25);
    expect(draftMark?.feel).toBe(4);
    expect(cleanText).toContain('¡Excelente registro!');
    expect(cleanText).not.toContain('```json');
  });

  it('extrae un objetivo (draftGoal) válido desde un bloque JSON', () => {
    const raw = `Te propongo la siguiente meta para pileta olímpica:
\`\`\`json
{
  "draftGoal": {
    "eventId": "50-free",
    "poolLength": 50,
    "targetTimeSec": 24.80,
    "label": "Objetivo Nacional"
  }
}
\`\`\`
`;

    const { cleanText, draftGoal, draftMark } = extractDraftFromResponse(raw);

    expect(draftGoal).toBeDefined();
    expect(draftMark).toBeUndefined();
    expect(draftGoal?.eventId).toBe('50-free');
    expect(draftGoal?.targetTimeSec).toBe(24.80);
    expect(draftGoal?.poolLength).toBe(50);
    expect(cleanText).toContain('Te propongo la siguiente meta');
  });

  it('fuerza 100-medley a pileta de 25m aunque el LLM devuelva 50m', () => {
    const raw = `\`\`\`json
{
  "draftMark": {
    "eventId": "100-medley",
    "timeSec": 65.0,
    "poolLength": 50
  }
}
\`\`\``;

    const { draftMark } = extractDraftFromResponse(raw);
    expect(draftMark?.eventId).toBe('100-medley');
    expect(draftMark?.poolLength).toBe(25);
  });
});

describe('aiService - sendChatMessage & testAiConnection', () => {
  const mockProfile: SwimmerProfile = {
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-fly', '100-free'],
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('arroja error si no hay API Key configurada para Gemini', async () => {
    await expect(
      sendChatMessage([], 'Hola', mockProfile, [], {
        provider: 'gemini',
        apiKey: '',
        modelName: 'gemini-1.5-flash',
      })
    ).rejects.toThrow('No has configurado una API Key');
  });

  it('realiza llamada correcta a Google Gemini aplicando ventana deslizante', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '¡Hola nadador! ¿Cómo te fue hoy?' }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const history = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Mensaje previo ${i}`,
      timestamp: new Date().toISOString(),
    }));

    const result = await sendChatMessage(history, 'Nuevo mensaje', mockProfile, [], {
      provider: 'gemini',
      apiKey: 'test-key',
      modelName: 'gemini-1.5-flash',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain('models/gemini-1.5-flash:generateContent');
    expect(calledUrl).toContain('key=test-key');

    const body = JSON.parse(calledOptions.body);
    // Verificamos que se acotó el historial a MAX_CONTEXT_MESSAGES (8) + 1 mensaje nuevo = 9 contents
    expect(body.contents.length).toBe(9);
    expect(result.text).toBe('¡Hola nadador! ¿Cómo te fue hoy?');
  });

  it('valida testAiConnection para Gemini exitosamente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await testAiConnection({
      provider: 'gemini',
      apiKey: 'test-key',
      modelName: 'gemini-1.5-flash',
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('exitosa');
  });
});

