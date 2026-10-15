import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftGoalCard } from './DraftGoalCard';
import { DraftGoalData, SwimMark, SwimmerProfile } from '../../types';

describe('DraftGoalCard', () => {
  const mockProfile: SwimmerProfile = {
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['100-free'],
    updatedAt: new Date().toISOString(),
  };

  const sampleGoal: DraftGoalData = {
    eventId: '100-free',
    poolLength: 50,
    targetTimeSec: 54.50,
    label: 'Meta Nacional',
    confirmed: false,
  };

  const sampleMarks: SwimMark[] = [
    {
      id: 1,
      eventId: '100-free',
      poolLength: 50,
      timeSec: 56.20,
      date: '2026-10-10',
      venue: 'CENARD',
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: new Date().toISOString(),
    },
  ];

  it('renderiza el objetivo y muestra comparativa con PB actual', () => {
    const onConfirm = vi.fn();
    render(
      <DraftGoalCard
        draft={sampleGoal}
        profile={mockProfile}
        marks={sampleMarks}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('100m Libre')).toBeInTheDocument();
    expect(screen.getByText('54.50')).toBeInTheDocument();
    expect(screen.getByText(/PB actual:/i)).toBeInTheDocument();
    expect(screen.getByText('56.20')).toBeInTheDocument();
    expect(screen.getByText(/-1.70s para meta/i)).toBeInTheDocument();
    expect(screen.getByText('Confirmar y Guardar Objetivo')).toBeInTheDocument();
  });

  it('guarda el objetivo al presionar el botón de confirmación', () => {
    const onConfirm = vi.fn();
    render(
      <DraftGoalCard
        draft={sampleGoal}
        profile={mockProfile}
        marks={sampleMarks}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Guardar Objetivo/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        targetTimeSec: 54.50,
        confirmed: true,
      })
    );
    expect(screen.getByText('Objetivo Guardado')).toBeInTheDocument();
  });
});

