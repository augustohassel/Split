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
    'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
  if (safePoints >= 750) {
    colorClass =
      'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
  } else if (safePoints >= 550) {
    colorClass = 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/40';
  } else if (safePoints >= 350) {
    colorClass = 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/40';
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

