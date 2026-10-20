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

  it('replica y previene el bug de duplicación acumulativa de palabras en Chrome para Android', () => {
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

    const handleResult = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: handleResult })
    );

    act(() => {
      result.current.startListening();
    });

    // En Chrome para Android, cada elemento en event.results acumula toda la frase previa
    act(() => {
      instance?.onresult?.({
        resultIndex: 3,
        results: [
          { 0: { transcript: '50' }, isFinal: true, length: 1 },
          { 0: { transcript: '50 libre' }, isFinal: true, length: 1 },
          { 0: { transcript: '50 libre 26' }, isFinal: true, length: 1 },
          { 0: { transcript: '50 libre 26.40' }, isFinal: true, length: 1 },
        ],
        length: 4,
      });
    });

    expect(result.current.transcript).toBe('50 libre 26.40');
    expect(result.current.finalTranscript).toBe('50 libre 26.40');
    expect(result.current.interimTranscript).toBe('');
    expect(handleResult).toHaveBeenLastCalledWith('50 libre 26.40');
  });

  it('maneja actualizaciones acumulativas de Android con tildes dinámicas, conversión de números y resultados interim solapados', () => {
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

    const handleResult = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ onResult: handleResult })
    );

    act(() => {
      result.current.startListening();
    });

    // 1. Tildes añadidas dinámicamente y resultado interim que repite el final
    act(() => {
      instance?.onresult?.({
        resultIndex: 2,
        results: [
          { 0: { transcript: 'sensacion' }, isFinal: true, length: 1 },
          { 0: { transcript: 'sensacion del nado' }, isFinal: true, length: 1 },
          { 0: { transcript: 'Sensación del nado cuatro' }, isFinal: false, length: 1 },
        ],
        length: 3,
      });
    });

    expect(result.current.transcript).toBe('Sensación del nado cuatro');
    expect(result.current.finalTranscript).toBe('sensacion del nado');
    expect(result.current.interimTranscript).toBe('cuatro');

    // 2. Conversión de número en texto ("cuatro") a dígito ("4") al continuar hablando
    act(() => {
      instance?.onresult?.({
        resultIndex: 3,
        results: [
          { 0: { transcript: 'sensacion' }, isFinal: true, length: 1 },
          { 0: { transcript: 'sensacion del nado' }, isFinal: true, length: 1 },
          { 0: { transcript: 'Sensación del nado cuatro' }, isFinal: true, length: 1 },
          { 0: { transcript: 'Sensación del nado 4 en pileta corta' }, isFinal: true, length: 1 },
        ],
        length: 4,
      });
    });

    expect(result.current.transcript).toBe('Sensación del nado 4 en pileta corta');
    expect(result.current.finalTranscript).toBe('Sensación del nado 4 en pileta corta');
    expect(result.current.interimTranscript).toBe('');

    // 3. Segunda frase tras una pausa, también emitida de forma acumulativa en Android
    act(() => {
      instance?.onresult?.({
        resultIndex: 5,
        results: [
          { 0: { transcript: 'Sensación del nado 4 en pileta corta' }, isFinal: true, length: 1 },
          { 0: { transcript: 'y logre' }, isFinal: true, length: 1 },
          { 0: { transcript: 'y logré bajar marca' }, isFinal: true, length: 1 },
        ],
        length: 3,
      });
    });

    expect(result.current.transcript).toBe('Sensación del nado 4 en pileta corta y logré bajar marca');
    expect(handleResult).toHaveBeenLastCalledWith(
      'Sensación del nado 4 en pileta corta y logré bajar marca'
    );
  });
});

