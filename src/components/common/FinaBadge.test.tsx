import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinaBadge } from './FinaBadge';

describe('FinaBadge Component', () => {
  it('renderiza puntos y etiqueta FINA por defecto', () => {
    render(<FinaBadge points={650} />);
    expect(screen.getByText('650')).toBeInTheDocument();
    expect(screen.getByText('FINA')).toBeInTheDocument();
  });

  it('oculta la etiqueta FINA cuando showLabel es false', () => {
    render(<FinaBadge points={420} showLabel={false} />);
    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.queryByText('FINA')).not.toBeInTheDocument();
  });

  it('aplica la clase de color adecuada para nivel alto (>= 750)', () => {
    const { container } = render(<FinaBadge points={810} />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-amber-300');
  });

  it('aplica la clase de color para nivel medio-alto (>= 550)', () => {
    const { container } = render(<FinaBadge points={590} />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-cyan-300');
  });

  it('aplica la clase de color para nivel medio (>= 350)', () => {
    const { container } = render(<FinaBadge points={400} />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-indigo-300');
  });

  it('no muestra puntos negativos si el valor es menor a 0', () => {
    render(<FinaBadge points={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
