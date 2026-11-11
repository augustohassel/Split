import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  applyThemeToDom,
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  readStoredTheme,
  THEME_STORAGE_KEY,
  useTheme,
  writeStoredTheme,
} from './useTheme';

describe('useTheme & utilidades de tema (Modo Oscuro / Modo Claro)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.add('dark');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', DARK_THEME_COLOR);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia en Modo Claro (light) por defecto cuando no existe preferencia guardada', () => {
    expect(readStoredTheme()).toBe('light');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      LIGHT_THEME_COLOR
    );
  });

  it('recupera Modo Oscuro (dark) si split_theme_v1 está guardado como dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      DARK_THEME_COLOR
    );
  });

  it('alterna entre light y dark actualizando localStorage, documentElement y meta[name="theme-color"]', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      DARK_THEME_COLOR
    );

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      LIGHT_THEME_COLOR
    );
  });

  it('permite seleccionar un tema específico mediante setTheme', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('caso de falla: ignora valores corruptos en localStorage y aplica fallback a light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia-invalido');
    expect(readStoredTheme()).toBe('light');
  });

  it('caso de falla: soporta excepciones de lectura y escritura en localStorage (SecurityError / QuotaExceededError) manteniendo el tema en memoria', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    // Aun con localStorage bloqueado, el estado en sesión y el DOM se actualizan sin lanzar error
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      DARK_THEME_COLOR
    );

    expect(() => writeStoredTheme('dark')).not.toThrow();
    expect(() => applyThemeToDom('dark')).not.toThrow();
  });
});

