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
        className={`inline-flex items-center rounded-full border font-semibold bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-sm shadow-amber-500/10 ${sizeClass}`}
        title="Récord Personal Oficial de Carrera (Largada estática)"
      >
        <Trophy className="w-3 h-3 text-amber-400" />
        <span>PB Carrera</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium bg-teal-500/20 text-teal-300 border-teal-400/35 ${sizeClass}`}
      title="Mejor Marca Personal en Entrenamiento"
    >
      <Zap className="w-3 h-3 text-teal-400" />
      <span>PB Entreno</span>
    </span>
  );
};

