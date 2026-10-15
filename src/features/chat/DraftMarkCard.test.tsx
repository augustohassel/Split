import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftMarkCard } from './DraftMarkCard';
import { DraftMarkData, SwimmerProfile } from '../../types';

describe('DraftMarkCard', () => {
  const mockProfile: SwimmerProfile = {
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-free'],
    updatedAt: new Date().toISOString(),
  };

  const sampleDraft: DraftMarkData = {
    eventId: '50-free',
    timeSec: 26.40,
    poolLength: 25,
    date: '2026-10-15',
    venue: 'CENARD',
    context: 'race',
    modality: 'individual',
    timing: 'electronic',
    feel: 4,
    notes: 'Salida veloz',
    confirmed: false,
  };

  it('renderiza la prueba, tiempo y puntos FINA calculados en vivo', () => {
    const onConfirm = vi.fn();
    render(
      <DraftMarkCard draft={sampleDraft} profile={mockProfile} onConfirm={onConfirm} />
    );

    expect(screen.getByText('50m Libre')).toBeInTheDocument();
    expect(screen.getByText('26.40')).toBeInTheDocument();
    expect(screen.getByText(/FINA/i)).toBeInTheDocument();
    expect(screen.getByText('428')).toBeInTheDocument();
    expect(screen.getByText('Confirmar y Guardar')).toBeInTheDocument();
  });

  it('permite alternar entre pileta de 25m y 50m recalculando puntos FINA', () => {
    const onConfirm = vi.fn();
    render(
      <DraftMarkCard draft={sampleDraft} profile={mockProfile} onConfirm={onConfirm} />
    );

    const btn50 = screen.getByRole('button', { name: '50m' });
    fireEvent.click(btn50);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Guardar/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        poolLength: 50,
        confirmed: true,
      })
    );
  });

  it('muestra estado guardado al confirmarse', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <DraftMarkCard draft={sampleDraft} profile={mockProfile} onConfirm={onConfirm} />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Guardar/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText('Guardada en Historial')).toBeInTheDocument();

    // Rerender con confirmed = true
    rerender(
      <DraftMarkCard
        draft={{ ...sampleDraft, confirmed: true }}
        profile={mockProfile}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText('Guardada en Historial')).toBeInTheDocument();
  });
});

