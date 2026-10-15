import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GoalsAndSettingsView } from './GoalsAndSettingsView';
import { SwimGoal, SwimMark, SwimmerProfile } from '../../types';

describe('GoalsAndSettingsView Component & Flujos de Ajustes', () => {
  const mockProfile: SwimmerProfile = {
    id: 1,
    name: 'Augusto',
    gender: 'male',
    birthYear: 1990,
    defaultPoolLength: 25,
    favoriteEventIds: ['50-fly', '100-free'],
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  const mockMarks: SwimMark[] = [
    {
      id: 1,
      eventId: '50-fly',
      timeSec: 27.5,
      date: '2026-10-01',
      venue: 'Club San Andrés',
      poolLength: 25,
      context: 'race',
      modality: 'individual',
      timing: 'electronic',
      splits: [],
      createdAt: '2026-10-01T10:00:00.000Z',
    },
  ];

  const mockGoals: SwimGoal[] = [
    {
      id: 1,
      eventId: '50-fly',
      poolLength: 25,
      targetTimeSec: 26.5,
      label: 'Meta Torneo Primavera',
      updatedAt: '2026-10-15T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza la pestaña de Objetivos por defecto y lista metas existentes', () => {
    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={vi.fn()}
        onSaveGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onLoadDemo={vi.fn()}
        onClearAllData={vi.fn()}
      />
    );

    expect(screen.getByText(/definir o actualizar objetivo/i)).toBeInTheDocument();
    expect(screen.getByText(/meta torneo primavera/i)).toBeInTheDocument();
  });

  it('permite crear o actualizar un objetivo guardándolo con éxito', async () => {
    const handleSaveGoal = vi.fn().mockResolvedValue(undefined);

    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={vi.fn()}
        onSaveGoal={handleSaveGoal}
        onDeleteGoal={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onLoadDemo={vi.fn()}
        onClearAllData={vi.fn()}
      />
    );

    const timeInput = screen.getByPlaceholderText(/ej: 26\.20/i);
    fireEvent.change(timeInput, { target: { value: '25.90' } });

    const submitBtn = screen.getByRole('button', { name: /guardar objetivo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSaveGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '50-fly',
          poolLength: 25,
          targetTimeSec: 25.9,
        })
      );
    });
  });

  it('permite eliminar un objetivo existente', async () => {
    const handleDeleteGoal = vi.fn().mockResolvedValue(undefined);

    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={vi.fn()}
        onSaveGoal={vi.fn()}
        onDeleteGoal={handleDeleteGoal}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onLoadDemo={vi.fn()}
        onClearAllData={vi.fn()}
      />
    );

    const deleteBtn = screen.getByTitle(/eliminar objetivo/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(handleDeleteGoal).toHaveBeenCalledWith(1);
    });
  });

  it('permite cambiar a la subpestaña de Perfil FINA y actualizar género y datos', async () => {
    const handleUpdateProfile = vi.fn().mockResolvedValue(undefined);

    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={handleUpdateProfile}
        onSaveGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onLoadDemo={vi.fn()}
        onClearAllData={vi.fn()}
      />
    );

    // Cambiar a subpestaña Perfil FINA
    const profileTabBtn = screen.getByRole('button', { name: /perfil fina/i });
    fireEvent.click(profileTabBtn);

    expect(screen.getByDisplayValue('Augusto')).toBeInTheDocument();

    // Cambiar género a Mujer
    const femaleBtn = screen.getByRole('button', { name: /mujer/i });
    fireEvent.click(femaleBtn);

    const saveProfileBtn = screen.getByRole('button', { name: /guardar perfil/i });
    fireEvent.click(saveProfileBtn);

    await waitFor(() => {
      expect(handleUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Augusto',
          gender: 'female',
        })
      );
    });
  });

  it('permite acceder a Datos & Backup y ejecutar carga de demo y exportaciones', async () => {
    const handleLoadDemo = vi.fn().mockResolvedValue({ marksAdded: 5, goalsAdded: 2 });
    const handleExportJson = vi.fn().mockResolvedValue(undefined);
    const handleExportCsv = vi.fn();

    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={vi.fn()}
        onSaveGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onExportJson={handleExportJson}
        onImportJson={vi.fn()}
        onExportCsv={handleExportCsv}
        onLoadDemo={handleLoadDemo}
        onClearAllData={vi.fn()}
      />
    );

    // Cambiar a subpestaña Datos
    const dataTabBtn = screen.getByRole('button', { name: /datos/i });
    fireEvent.click(dataTabBtn);

    // Cargar demo
    const loadDemoBtn = screen.getByRole('button', { name: /cargar conjunto de demostración/i });
    fireEvent.click(loadDemoBtn);
    await waitFor(() => {
      expect(handleLoadDemo).toHaveBeenCalled();
    });

    // Exportar JSON
    const exportJsonBtn = screen.getByRole('button', { name: /exportar backup json/i });
    fireEvent.click(exportJsonBtn);
    expect(handleExportJson).toHaveBeenCalled();

    // Exportar CSV
    const exportCsvBtn = screen.getByRole('button', { name: /exportar marcas csv/i });
    fireEvent.click(exportCsvBtn);
    expect(handleExportCsv).toHaveBeenCalled();
  });

  it('abre el diálogo de confirmación para restablecer todos los datos y ejecuta el borrado', async () => {
    const handleClearAll = vi.fn().mockResolvedValue(undefined);

    render(
      <GoalsAndSettingsView
        profile={mockProfile}
        marks={mockMarks}
        goals={mockGoals}
        onUpdateProfile={vi.fn()}
        onSaveGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onExportJson={vi.fn()}
        onImportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onLoadDemo={vi.fn()}
        onClearAllData={handleClearAll}
      />
    );

    // Ir a Datos
    const dataTabBtn = screen.getByRole('button', { name: /datos/i });
    fireEvent.click(dataTabBtn);

    // Abrir diálogo de borrado
    const resetTriggerBtn = screen.getByRole('button', { name: /borrar marcas y objetivos/i });
    fireEvent.click(resetTriggerBtn);

    // Modal de confirmación
    const confirmClearBtn = screen.getByRole('button', { name: /sí, borrar ahora/i });
    fireEvent.click(confirmClearBtn);

    await waitFor(() => {
      expect(handleClearAll).toHaveBeenCalled();
    });
  });
});
