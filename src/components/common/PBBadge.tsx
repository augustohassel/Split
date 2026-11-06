import React from 'react';
import { Trophy, Zap } from 'lucide-react';

interface PBBadgeProps {
  type: 'race-pb' | 'training-pb';
  size?: 'sm' | 'md';
}

export const PBBadge: React.FC<PBBadgeProps> = ({ type, size = 'sm' }) => {
  const isRace = type === 'race-pb';
  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  if (isRace) {
    return (
      <span
        className={`inline-flex items-center rounded-full border font-semibold bg-status-amber/15 text-status-amber border-status-amber/40 shadow-sm shadow-status-amber/10 ${sizeClass}`}
        title="Récord Personal Oficial de Carrera (Largada estática)"
      >
        <Trophy className="w-3 h-3 text-status-amber" />
        <span>PB Carrera</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium bg-status-emerald/15 text-status-emerald border-status-emerald/40 ${sizeClass}`}
      title="Mejor Marca Personal en Entrenamiento"
    >
      <Zap className="w-3 h-3 text-status-emerald" />
      <span>PB Entreno</span>
    </span>
  );
};
