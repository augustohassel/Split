import React from 'react';
import { Award } from 'lucide-react';

interface FinaBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const FinaBadge: React.FC<FinaBadgeProps> = ({
  points,
  size = 'md',
  showLabel = true,
}) => {
  const safePoints = Math.max(0, Math.round(points));

  let colorClass =
    'bg-surface-container-high/80 text-on-surface-variant border-outline/50';
  if (safePoints >= 750) {
    colorClass =
      'bg-status-amber/15 text-status-amber border-status-amber/40 shadow-sm shadow-status-amber/10';
  } else if (safePoints >= 550) {
    colorClass = 'bg-status-cyan/15 text-status-cyan border-status-cyan/40';
  } else if (safePoints >= 350) {
    colorClass = 'bg-status-indigo/15 text-status-indigo border-status-indigo/40';
  }

  const sizeClass =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : size === 'lg'
        ? 'text-sm px-3 py-1 gap-1.5 font-bold'
        : 'text-xs px-2.5 py-0.5 gap-1 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono ${colorClass} ${sizeClass}`}
      title="Puntos FINA (World Aquatics)"
    >
      <Award className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{safePoints}</span>
      {showLabel && <span className="font-sans opacity-80">FINA</span>}
    </span>
  );
};
