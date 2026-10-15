import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RegisterMarkView } from './RegisterMarkView';
import { SwimGoal, SwimMark, SwimmerProfile } from '../../types';

describe('RegisterMarkView Component & Guardado de Marcas', () => {
  const mockProfile: SwimmerProfile = {
    id: 1,
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-fly', '100-free'],
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  const existingMarks: SwimMark[] = [
    {
      id: 1,
      eventId: '50-fly',
      timeSec: 27.5,
      date: '2026-10-01',
      venue: 'CENARD',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ];

  const mockGoals: SwimGoal[] = [];

  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza la vista con la prueba y pileta por defecto', () => {
    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={vi.fn().mockResolvedValue({} as SwimMark)}
      />
    );

    expect(screen.getByRole('heading', { name: /^registrar marca$/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/50m Mariposa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /25m \(corta\)/i })).toBeInTheDocument();
  });

  it('permite alternar el tamaño de la pileta entre 25m y 50m', () => {
    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={vi.fn().mockResolvedValue({} as SwimMark)}
      />
    );

    const btn50 = screen.getByRole('button', { name: /50m \(olímpica\)/i });
    fireEvent.click(btn50);
    expect(btn50.className).toContain('bg-cyan-500');
  });

  it('muestra error de validación cuando el tiempo es vacío o inválido', async () => {
    const handleSave = vi.fn();
    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={handleSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /registrar marca/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/ingresa un tiempo total válido/i)
    ).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('soporta entrada de tiempo en teclado móvil con doble punto (ej: 1.02.40) y calcula Puntos FINA en vivo', async () => {
    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        initialEventId="100-free"
        onSaveMark={vi.fn().mockResolvedValue({} as SwimMark)}
      />
    );

    const timeInput = screen.getByLabelText(/tiempo total/i);
    fireEvent.change(timeInput, { target: { value: '1.02.40' } });

    // 100m Libre masculino en 62.40s debe calcular y renderizar la pastilla FINA
    await waitFor(() => {
      expect(screen.getByTitle(/puntos fina/i)).toBeInTheDocument();
      expect(screen.getByText('FINA')).toBeInTheDocument();
    });
  });

  it('guarda una marca exitosamente llamando a onSaveMark con los datos correctos', async () => {
    const handleSave = vi.fn().mockResolvedValue({
      id: 2,
      eventId: '50-fly',
      timeSec: 26.8,
      date: '2026-10-15',
      venue: 'Torneo Oficial',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-10-15T10:00:00.000Z',
    });

    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={existingMarks}
        goals={mockGoals}
        onSaveMark={handleSave}
      />
    );

    const timeInput = screen.getByLabelText(/tiempo total/i);
    fireEvent.change(timeInput, { target: { value: '26.80' } });

    const submitBtn = screen.getByRole('button', { name: /registrar marca/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '50-fly',
          timeSec: 26.8,
          poolLength: 25,
          context: 'race',
          modality: 'individual',
        }),
        undefined
      );
    });

    // Muestra confirmación de guardado
    expect(
      await screen.findByText(/¡marca guardada en tu dispositivo!/i)
    ).toBeInTheDocument();
  });

  it('rechaza el guardado si un parcial acumulado intermedio es mayor o igual al tiempo total', async () => {
    const handleSave = vi.fn();

    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={handleSave}
      />
    );

    const timeInput = screen.getByLabelText(/tiempo total/i);
    fireEvent.change(timeInput, { target: { value: '26.00' } });

    // Cargar un parcial acumulado en 15m inválido (27.00 >= 26.00)
    const splitInput15 = screen.getByPlaceholderText(/ej: 6\.40/i);
    fireEvent.change(splitInput15, { target: { value: '27.00' } });

    const submitBtn = screen.getByRole('button', { name: /registrar marca/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/debe ser menor al tiempo total/i)
    ).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('permite registrar parciales válidos y los incluye en la marca guardada', async () => {
    const handleSave = vi.fn().mockResolvedValue({} as SwimMark);

    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={handleSave}
      />
    );

    const timeInput = screen.getByLabelText(/tiempo total/i);
    fireEvent.change(timeInput, { target: { value: '26.50' } });

    // Cargar tramo 15m
    const splitInput15 = screen.getByPlaceholderText(/ej: 6\.40/i);
    fireEvent.change(splitInput15, { target: { value: '6.80' } });

    const submitBtn = screen.getByRole('button', { name: /registrar marca/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSec: 26.5,
          splits: expect.arrayContaining([
            expect.objectContaining({ distance: 15, cumulativeTimeSec: 6.8 }),
            expect.objectContaining({ distance: 50, cumulativeTimeSec: 26.5 }),
          ]),
        }),
        undefined
      );
    });
  });

  it('soporta modo edición actualizando una marca existente', async () => {
    const handleSave = vi.fn().mockResolvedValue({} as SwimMark);
    const markToEdit: SwimMark = {
      id: 99,
      eventId: '50-fly',
      timeSec: 28.2,
      date: '2026-10-10',
      venue: 'Club San Andrés',
      poolLength: 25,
      context: 'training',
      modality: 'individual',
      timing: 'manual',
      splits: [],
      createdAt: '2026-10-10T10:00:00.000Z',
    };

    render(
      <RegisterMarkView
        profile={mockProfile}
        marks={[markToEdit]}
        goals={[]}
        editingMark={markToEdit}
        onSaveMark={handleSave}
      />
    );

    expect(
      screen.getByRole('heading', { name: /editar marca/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /guardar cambios en la marca/i })
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /guardar cambios en la marca/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '50-fly',
          timeSec: 28.2,
          poolLength: 25,
        }),
        99
      );
    });
  });
});
