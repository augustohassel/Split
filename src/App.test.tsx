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
});
