import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { clearAllData, getStoreState } from './db';

describe('App Integration & Flujo Completo de Usuario', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllData(true);
  });

  it('renderiza la aplicación con la vista inicial del Dashboard', async () => {
    render(<App />);

    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /panel del nadador/i })).toBeInTheDocument();
  });

  it('permite navegar entre pestañas mediante la barra de navegación inferior', async () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });

    // Ir a Registrar
    fireEvent.click(within(nav).getByRole('button', { name: /registrar/i }));
    expect(screen.getByRole('heading', { name: /^registrar marca$/i })).toBeInTheDocument();

    // Ir a Historial
    fireEvent.click(within(nav).getByRole('button', { name: /historial/i }));
    expect(screen.getByRole('heading', { name: /evolución e historial/i })).toBeInTheDocument();

    // Ir a Chat
    fireEvent.click(within(nav).getByRole('button', { name: /chat/i }));
    expect(screen.getByRole('heading', { name: /asistente conversacional/i })).toBeInTheDocument();

    // Ir a Objetivos
    fireEvent.click(within(nav).getByRole('button', { name: /objetivos/i }));
    expect(screen.getByRole('heading', { name: /objetivos y ajustes/i })).toBeInTheDocument();
  });

  it('flujo crítico: registrar una marca desde la UI se refleja de inmediato en el almacén y en el historial', async () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });

    // 1. Navegar a Registrar
    fireEvent.click(within(nav).getByRole('button', { name: /registrar/i }));

    // 2. Llenar tiempo total
    const timeInput = screen.getByLabelText(/tiempo total/i);
    fireEvent.change(timeInput, { target: { value: '26.40' } });

    // 3. Guardar marca
    const submitBtn = screen.getByRole('button', { name: /registrar marca/i });
    fireEvent.click(submitBtn);

    // 4. Confirmación visual en pantalla
    expect(
      await screen.findByText(/¡marca guardada en tu dispositivo!/i)
    ).toBeInTheDocument();

    // 5. Verificar que persiste en el store
    const store = getStoreState();
    expect(store.marks.some((m) => m.timeSec === 26.4)).toBe(true);

    // 6. Navegar a Historial y verificar que la marca está en la lista
    fireEvent.click(within(nav).getByRole('button', { name: /historial/i }));
    const matches = await screen.findAllByText('26.40');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('permite alternar entre Modo Oscuro y Modo Claro de forma sincronizada entre Header y Ajustes', async () => {
    render(<App />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Alternar desde el botón rápido del Header
    const headerToggle = screen.getByRole('button', { name: /cambiar a modo claro/i });
    fireEvent.click(headerToggle);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('split_theme_v1')).toBe('light');

    // Verificar sincronización en Objetivos y Ajustes -> Perfil FINA
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    fireEvent.click(within(nav).getByRole('button', { name: /objetivos/i }));
    fireEvent.click(screen.getByRole('button', { name: /perfil fina/i }));

    const darkOptionBtn = screen.getByRole('button', { name: /^modo oscuro$/i });
    fireEvent.click(darkOptionBtn);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('split_theme_v1')).toBe('dark');
  });

  it('expande el contenedor principal para escritorio y permite navegar desde la barra superior sin perder estado al redimensionar', async () => {
    render(<App />);

    const mainEl = screen.getByRole('main');
    expect(mainEl.className).toContain('md:max-w-6xl');
    expect(mainEl.className).toContain('lg:max-w-7xl');
    expect(mainEl.className).toContain('md:pb-8');

    const topNav = screen.getByRole('navigation', { name: /navegación superior/i });
    fireEvent.click(within(topNav).getByRole('button', { name: /registrar/i }));
    expect(screen.getByRole('heading', { name: /^registrar marca$/i })).toBeInTheDocument();

    const timeInput = screen.getByLabelText(/tiempo total/i) as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '27.15' } });
    expect(timeInput.value).toBe('27.15');

    // Simular redimensionamiento en vivo de escritorio a móvil y viceversa
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));
    window.innerWidth = 1280;
    fireEvent(window, new Event('resize'));

    // Ni la pestaña activa ni el tiempo ingresado deben reiniciarse
    expect(screen.getByRole('heading', { name: /^registrar marca$/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/tiempo total/i) as HTMLInputElement).value).toBe('27.15');
  });
});
