import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

describe('useSpeechRecognition', () => {
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('reporta isSupported=false cuando la API no está en window', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);

    act(() => {
      result.current.startListening();
    });

    expect(result.current.error).toContain('no está soportado');
  });

  it('inicia y detiene la escucha correctamente con mock de SpeechRecognition', () => {
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const mockAbort = vi.fn();

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      start = mockStart;
      stop = mockStop;
      abort = mockAbort;
      onresult = null;
      onerror = null;
      onend = null;
    }

    window.SpeechRecognition = MockSpeechRecognition as unknown as typeof window.SpeechRecognition;

    const onResultMock = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: onResultMock, lang: 'es-AR' })
    );

    expect(result.current.isSupported).toBe(true);

    act(() => {
      result.current.startListening();
    });

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(false);
  });

  it('clasifica fragmentos finales e intermedios sin duplicar palabras', () => {
    let instance: {
      onresult: ((event: unknown) => void) | null;
      onerror: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    } | null = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      onresult = null;
      onerror = null;
      onend = null;
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instance = this;
      }
    }

    window.SpeechRecognition = MockSpeechRecognition as unknown as typeof window.SpeechRecognition;

    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));

    act(() => {
      result.current.startListening();
    });

    // 1er evento: transcripción provisoria (interim)
    act(() => {
      instance?.onresult?.({
        results: [
          {
            0: { transcript: '50 libre' },
            isFinal: false,
            length: 1,
          },
        ],
        length: 1,
        resultIndex: 0,
      });
    });

    expect(result.current.interimTranscript).toBe('50 libre');
    expect(result.current.finalTranscript).toBe('');
    expect(result.current.transcript).toBe('50 libre');

    // 2do evento: transcripción final confirmada
    act(() => {
      instance?.onresult?.({
        results: [
          {
            0: { transcript: '50 libre' },
            isFinal: true,
            length: 1,
          },
          {
            0: { transcript: '26.40' },
            isFinal: true,
            length: 1,
          },
        ],
        length: 2,
        resultIndex: 0,
      });
    });

    expect(result.current.finalTranscript).toBe('50 libre 26.40');
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.transcript).toBe('50 libre 26.40');
  });
});

