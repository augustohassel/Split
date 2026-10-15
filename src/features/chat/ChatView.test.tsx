import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from './ChatView';
import { SwimmerProfile } from '../../types';

describe('ChatView', () => {
  const mockProfile: SwimmerProfile = {
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-free'],
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra mensaje de bienvenida del asistente', () => {
    const onSaveMark = vi.fn().mockResolvedValue({ id: 1 });
    const onSaveGoal = vi.fn().mockResolvedValue({ id: 1 });

    render(
      <ChatView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={onSaveMark}
        onSaveGoal={onSaveGoal}
      />
    );

    expect(screen.getByText(/¡Hola Augusto!/i)).toBeInTheDocument();
    expect(screen.getByText(/Comandos Rápidos 100% Offline/i)).toBeInTheDocument();
  });

  it('interpreta un comando rápido offline y renderiza DraftMarkCard de inmediato', async () => {
    const onSaveMark = vi.fn().mockResolvedValue({ id: 1 });
    const onSaveGoal = vi.fn().mockResolvedValue({ id: 1 });

    render(
      <ChatView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={onSaveMark}
        onSaveGoal={onSaveGoal}
      />
    );

    const input = screen.getByPlaceholderText(/Escribí o dictá/i);
    fireEvent.change(input, { target: { value: '50 libre 26.40 en 25m' } });

    const sendBtn = screen.getByTitle('Enviar mensaje');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Propuesta de Marca')).toBeInTheDocument();
      expect(screen.getByText('50m Libre')).toBeInTheDocument();
      expect(screen.getByText('26.40')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Guardar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSaveMark).toHaveBeenCalledTimes(1);
      expect(onSaveMark).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: '50-free',
          timeSec: 26.40,
          poolLength: 25,
        })
      );
    });
  });

  it('permite abrir el modal de configuración de IA (BYOK)', () => {
    const onSaveMark = vi.fn().mockResolvedValue({ id: 1 });
    const onSaveGoal = vi.fn().mockResolvedValue({ id: 1 });

    render(
      <ChatView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={onSaveMark}
        onSaveGoal={onSaveGoal}
      />
    );

    const settingsBtn = screen.getByTitle(/Configuración de IA/i);
    fireEvent.click(settingsBtn);

    expect(screen.getByText('Asistente IA (BYOK)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google Gemini' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OpenAI / Ollama' })).toBeInTheDocument();
  });

  it('permite vaciar la conversación con el botón de reiniciar', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const onSaveMark = vi.fn().mockResolvedValue({ id: 1 });
    const onSaveGoal = vi.fn().mockResolvedValue({ id: 1 });

    render(
      <ChatView
        profile={mockProfile}
        marks={[]}
        goals={[]}
        onSaveMark={onSaveMark}
        onSaveGoal={onSaveGoal}
      />
    );

    const resetBtn = screen.getByTitle(/Iniciar nueva conversación/i);
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/¡Hola Augusto!/i)).toBeInTheDocument();
  });
});

