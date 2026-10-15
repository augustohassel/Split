import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { SwimGoal, SwimMark, SwimmerProfile } from '../../types';

describe('DashboardView Component & Métricas del Nadador', () => {
  const mockProfile: SwimmerProfile = {
    id: 1,
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-fly', '100-free'],
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  const mockMarks: SwimMark[] = [
    {
      id: 1,
      eventId: '50-fly',
      timeSec: 26.5,
      date: '2026-10-12',
      venue: 'CENARD',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-10-12T10:00:00.000Z',
    },
    {
      id: 2,
      eventId: '100-free',
      timeSec: 58.2,
      date: '2026-10-10',
      venue: 'Club San Andrés',
      poolLength: 25,
      context: 'training',
      modality: 'individual',
      timing: 'manual',
      splits: [],
      createdAt: '2026-10-10T10:00:00.000Z',
    },
  ];

  const mockGoals: SwimGoal[] = [
    {
      id: 1,
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: 26.0,
      label: 'Meta 50m Mariposa',
      updatedAt: '2026-10-15T00:00:00.000Z',
    },
  ];

  it('renderiza el panel con KPIs de marcas totales y mejor rendimiento FINA', () => {
    render(
      <DashboardView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /panel del nadador/i })).toBeInTheDocument();
    expect(screen.getByText('Marcas')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/1 carr\. · 1 entr\./i)).toBeInTheDocument();
  });

  it('filtra por tamaño de pileta al pulsar los botones de filtro', () => {
    render(
      <DashboardView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onNavigate={vi.fn()}
      />
    );

    const btn50m = screen.getByRole('button', { name: /^50m$/i });
    fireEvent.click(btn50m);
    expect(btn50m.className).toContain('bg-cyan-500');
  });

  it('permite navegar a configuración de objetivos desde el acceso directo', () => {
    const handleNavigate = vi.fn();
    render(
      <DashboardView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onNavigate={handleNavigate}
      />
    );

    const configBtn = screen.getByRole('button', { name: /configurar/i });
    fireEvent.click(configBtn);
    expect(handleNavigate).toHaveBeenCalledWith('goals');
  });
});
