import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PBBadge } from './PBBadge';

describe('PBBadge Component', () => {
  it('renderiza la insignia de PB Carrera con estilo y texto correspondiente', () => {
    const { container } = render(<PBBadge type="race-pb" />);
    expect(screen.getByText('PB Carrera')).toBeInTheDocument();
    expect(container.querySelector('span')?.className).toContain('text-amber-300');
  });

  it('renderiza la insignia de PB Entreno con estilo y texto correspondiente', () => {
    const { container } = render(<PBBadge type="training-pb" />);
    expect(screen.getByText('PB Entreno')).toBeInTheDocument();
    expect(container.querySelector('span')?.className).toContain('text-teal-300');
  });

  it('aplica clases para tamaño md', () => {
    const { container } = render(<PBBadge type="race-pb" size="md" />);
    expect(container.querySelector('span')?.className).toContain('text-xs');
  });
});
