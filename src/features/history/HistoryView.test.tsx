import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HistoryView } from './HistoryView';
import { SwimGoal, SwimMark, SwimmerProfile } from '../../types';

describe('HistoryView Component & Visualización de Historial', () => {
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
      id: 10,
      eventId: '50-fly',
      timeSec: 26.5,
      date: '2026-10-12',
      venue: 'CENARD',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [
        { distance: 15, cumulativeTimeSec: 6.8 },
        { distance: 25, cumulativeTimeSec: 12.2 },
        { distance: 50, cumulativeTimeSec: 26.5 },
      ],
      createdAt: '2026-10-12T10:00:00.000Z',
    },
    {
      id: 11,
      eventId: '50-fly',
      timeSec: 27.2,
      date: '2026-10-05',
      venue: 'Club San Andrés',
      poolLength: 25,
      context: 'training',
      modality: 'individual',
      timing: 'manual',
      splits: [],
      createdAt: '2026-10-05T10:00:00.000Z',
    },
  ];

  const mockGoals: SwimGoal[] = [];

  it('renderiza el listado de marcas con tiempos, badges y sede', () => {
    render(
      <HistoryView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onEditMark={vi.fn()}
        onDeleteMark={vi.fn()}
      />
    );

    expect(screen.getAllByText('26.50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('27.20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('CENARD')).toBeInTheDocument();
    expect(screen.getByText('Club San Andrés')).toBeInTheDocument();
  });

  it('muestra el desglose de parciales (splits) cuando la marca los incluye', () => {
    render(
      <HistoryView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onEditMark={vi.fn()}
        onDeleteMark={vi.fn()}
      />
    );

    expect(screen.getAllByText(/desglose de parciales/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0-15m')).toBeInTheDocument();
    expect(screen.getByText('6.80')).toBeInTheDocument();
  });

  it('permite filtrar marcas por contexto (ej: Carrera vs Entrenamiento)', () => {
    render(
      <HistoryView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onEditMark={vi.fn()}
        onDeleteMark={vi.fn()}
      />
    );

    // Filtrar solo entrenamiento mediante el select de contexto
    const contextSelect = screen.getByDisplayValue(/todos \(carrera \+ entreno\)/i);
    fireEvent.change(contextSelect, { target: { value: 'training' } });

    // La marca de entrenamiento (Club San Andrés) se muestra, pero la de carrera (CENARD) se oculta
    expect(screen.getByText('Club San Andrés')).toBeInTheDocument();
    expect(screen.queryByText('CENARD')).not.toBeInTheDocument();
  });

  it('llama a onEditMark al hacer clic en el botón de editar', () => {
    const handleEdit = vi.fn();
    render(
      <HistoryView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onEditMark={handleEdit}
        onDeleteMark={vi.fn()}
      />
    );

    const editButtons = screen.getAllByTitle(/editar marca/i);
    fireEvent.click(editButtons[0]);

    expect(handleEdit).toHaveBeenCalledWith(mockMarks[0]);
  });

  it('requiere confirmación y llama a onDeleteMark al eliminar una marca', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <HistoryView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onEditMark={vi.fn()}
        onDeleteMark={handleDelete}
      />
    );

    const deleteButtons = screen.getAllByTitle(/eliminar marca/i);
    fireEvent.click(deleteButtons[0]);

    // Debe aparecer botón Confirmar
    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith(10);
    });
  });

  it('muestra mensaje cuando no hay marcas registradas para la prueba seleccionada', () => {
    render(
      <HistoryView
        profile={mockProfile}
        marks={[]}
        goals={mockGoals}
        onEditMark={vi.fn()}
        onDeleteMark={vi.fn()}
      />
    );

    expect(
      screen.getByText(/no se encontraron marcas para 50m mariposa/i)
    ).toBeInTheDocument();
  });
});
