import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from './Header';
import { SwimmerProfile } from '../../types';

describe('Header Component', () => {
  const mockProfile: SwimmerProfile = {
    id: 1,
    name: 'Augusto',
    gender: 'male',
    defaultPoolLength: 25,
    favoriteEventIds: ['50-fly'],
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  it('renderiza el título y logo de Split', () => {
    render(<Header profile={mockProfile} onSelectTab={vi.fn()} />);
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('Marcas, Parciales & Puntos FINA')).toBeInTheDocument();
  });

  it('renderiza la información del perfil del nadador', () => {
    render(<Header profile={mockProfile} onSelectTab={vi.fn()} />);
    expect(screen.getByText('Augusto')).toBeInTheDocument();
    expect(screen.getByText(/Hombre · 25m/i)).toBeInTheDocument();
  });

  it('navega al dashboard al hacer clic en el logo', () => {
    const handleSelect = vi.fn();
    render(<Header profile={mockProfile} onSelectTab={handleSelect} />);
    fireEvent.click(screen.getByText('Split'));
    expect(handleSelect).toHaveBeenCalledWith('dashboard');
  });

  it('navega a objetivos/ajustes al hacer clic en la pastilla del perfil', () => {
    const handleSelect = vi.fn();
    render(<Header profile={mockProfile} onSelectTab={handleSelect} />);
    fireEvent.click(screen.getByText('Augusto'));
    expect(handleSelect).toHaveBeenCalledWith('goals');
  });

  it('navega al chat al hacer clic en el botón de Asistente de Chat', () => {
    const handleSelect = vi.fn();
    render(<Header profile={mockProfile} onSelectTab={handleSelect} />);
    const chatBtn = screen.getByTitle('Abrir Asistente de Chat');
    fireEvent.click(chatBtn);
    expect(handleSelect).toHaveBeenCalledWith('chat');
  });
});
