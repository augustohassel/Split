import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav Component', () => {
  it('renderiza los 4 accesos principales de navegación', () => {
    render(<BottomNav activeTab="dashboard" onSelectTab={vi.fn()} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Registrar')).toBeInTheDocument();
    expect(screen.getByText('Historial')).toBeInTheDocument();
    expect(screen.getByText('Objetivos')).toBeInTheDocument();
  });

  it('llama a onSelectTab al hacer clic en una pestaña', () => {
    const handleSelect = vi.fn();
    render(<BottomNav activeTab="dashboard" onSelectTab={handleSelect} />);
    fireEvent.click(screen.getByText('Registrar'));
    expect(handleSelect).toHaveBeenCalledWith('register');
  });

  it('muestra el contador de marcas en la pestaña de Historial cuando marksCount > 0', () => {
    render(<BottomNav activeTab="dashboard" onSelectTab={vi.fn()} marksCount={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('destaca visualmente la pestaña activa', () => {
    render(<BottomNav activeTab="history" onSelectTab={vi.fn()} />);
    const historyBtn = screen.getByRole('button', { name: /historial/i });
    expect(historyBtn.className).toContain('text-cyan-400');
  });
});
