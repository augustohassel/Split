import React, { useState } from 'react';
import { DraftGoalData, PoolLength, SwimMark, SwimmerProfile } from '../../types';
import { getEventById } from '../../utils/events';
import { calculateFinaPoints } from '../../utils/fina';
import { formatSwimTime } from '../../utils/calculator';
import { FinaBadge } from '../../components/common/FinaBadge';
import { Check, CheckCircle2, Target, TrendingUp } from 'lucide-react';

interface DraftGoalCardProps {
  draft: DraftGoalData;
  profile: SwimmerProfile;
  marks?: SwimMark[];
  onConfirm: (finalData: DraftGoalData) => void;
}

export const DraftGoalCard: React.FC<DraftGoalCardProps> = ({
  draft,
  profile,
  marks = [],
  onConfirm,
}) => {
  const [data, setData] = useState<DraftGoalData>({ ...draft });
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(draft.confirmed));

  const event = getEventById(data.eventId);
  const targetFinaPoints = calculateFinaPoints(
    data.targetTimeSec,
    data.eventId,
    data.poolLength,
    profile.gender
  );

  // Buscar mejor marca personal previa para esta prueba y tamaño de pileta
  const pbMark = marks
    .filter(
      (m) =>
        m.eventId === data.eventId &&
        m.poolLength === data.poolLength &&
        (m.modality === 'individual' || m.modality === 'relay_lead')
    )
    .sort((a, b) => a.timeSec - b.timeSec)[0];

  const gapSec = pbMark ? pbMark.timeSec - data.targetTimeSec : null;

  const handleTogglePool = (pool: PoolLength) => {
    if (isSaved) return;
    if (data.eventId === '100-medley' && pool === 50) return;
    setData((prev) => ({ ...prev, poolLength: pool }));
  };

  const handleSave = () => {
    if (isSaved) return;
    setIsSaved(true);
    onConfirm({ ...data, confirmed: true });
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/30 p-3.5 shadow-md dark:shadow-lg shadow-emerald-950/5 dark:shadow-emerald-950/20 text-slate-900 dark:text-slate-100 flex flex-col gap-3 my-1">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-emerald-300 truncate">
            Propuesta de Objetivo
          </span>
        </div>
        <FinaBadge points={targetFinaPoints} size="sm" />
      </div>

      {/* Detalle principal: Prueba y Tiempo Meta */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-white leading-tight">
            {event.name}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono">
            {data.label || 'Meta'} · Pileta {data.poolLength}m
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black font-mono text-emerald-400">
            {formatSwimTime(data.targetTimeSec)}
          </span>
        </div>
      </div>

      {/* Selector de Pileta */}
      {!isSaved && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-400">Tamaño de Pileta:</span>
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => handleTogglePool(25)}
              className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.poolLength === 25
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              25m
            </button>
            <button
              type="button"
              disabled={data.eventId === '100-medley'}
              onClick={() => handleTogglePool(50)}
              className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.poolLength === 50
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              50m
            </button>
          </div>
        </div>
      )}

      {/* Comparativa con Récord Personal (PB) */}
      {pbMark && (
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>PB actual: <strong className="font-mono text-white">{formatSwimTime(pbMark.timeSec)}</strong></span>
          </div>
          {gapSec !== null && (
            <span className={`font-mono font-bold ${gapSec > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {gapSec > 0 ? `-${gapSec.toFixed(2)}s para meta` : '¡Objetivo superado!'}
            </span>
          )}
        </div>
      )}

      {/* Botón de confirmación */}
      <div className="pt-1">
        {isSaved ? (
          <div className="w-full py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Objetivo Guardado</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirmar y Guardar Objetivo</span>
          </button>
        )}
      </div>
    </div>
  );
};

