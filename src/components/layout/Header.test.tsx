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
    expect(chatBtn.className).toContain('md:hidden');
    fireEvent.click(chatBtn);
    expect(handleSelect).toHaveBeenCalledWith('chat');
  });

  it('renderiza el botón conmutador de tema y ejecuta onToggleTheme', () => {
    const handleToggleTheme = vi.fn();
    const { rerender } = render(
      <Header
        profile={mockProfile}
        onSelectTab={vi.fn()}
        theme="dark"
        onToggleTheme={handleToggleTheme}
      />
    );

    const toggleToLightBtn = screen.getByRole('button', { name: /cambiar a modo claro/i });
    fireEvent.click(toggleToLightBtn);
    expect(handleToggleTheme).toHaveBeenCalledTimes(1);

    rerender(
      <Header
        profile={mockProfile}
        onSelectTab={vi.fn()}
        theme="light"
        onToggleTheme={handleToggleTheme}
      />
    );
    expect(screen.getByRole('button', { name: /cambiar a modo oscuro/i })).toBeInTheDocument();
  });

  it('renderiza la barra de navegación superior de escritorio con los 5 accesos', () => {
    const handleSelect = vi.fn();
    render(
      <Header
        profile={mockProfile}
        activeTab="dashboard"
        marksCount={5}
        onSelectTab={handleSelect}
      />
    );

    const desktopNav = screen.getByRole('navigation', { name: /navegación superior/i });
    expect(desktopNav).toBeInTheDocument();
    expect(desktopNav.className).toContain('hidden md:flex');

    const historyTab = screen.getByRole('button', { name: /historial/i });
    expect(historyTab).toBeInTheDocument();
    expect(historyTab).toHaveTextContent('5');

    fireEvent.click(historyTab);
    expect(handleSelect).toHaveBeenCalledWith('history');
  });

  it('destaca la pestaña activa en la navegación de escritorio', () => {
    render(
      <Header
        profile={mockProfile}
        activeTab="register"
        onSelectTab={vi.fn()}
      />
    );

    const registerTab = screen.getByRole('button', { name: /registrar/i });
    expect(registerTab.className).toContain('text-primary-md3');
  });

  it('permite iniciar sesión con Google y cerrar sesión desde el Header', () => {
    const handleSignIn = vi.fn();
    const handleSignOut = vi.fn();

    const { rerender } = render(
      <Header
        profile={mockProfile}
        onSelectTab={vi.fn()}
        isFirebaseAvailable={true}
        authUser={null}
        onSignInGoogle={handleSignIn}
      />
    );

    const signInBtn = screen.getByRole('button', { name: /conectar google/i });
    fireEvent.click(signInBtn);
    expect(handleSignIn).toHaveBeenCalledTimes(1);

    rerender(
      <Header
        profile={mockProfile}
        onSelectTab={vi.fn()}
        isFirebaseAvailable={true}
        authUser={{
          uid: 'uid-123',
          displayName: 'Augusto',
          email: 'augusto@example.com',
          photoURL: null,
        }}
        syncStatus="synced"
        onSignOutGoogle={handleSignOut}
      />
    );

    expect(screen.getByText('Cloud')).toBeInTheDocument();
    const signOutBtn = screen.getByRole('button', { name: /cerrar sesión de google/i });
    fireEvent.click(signOutBtn);
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
