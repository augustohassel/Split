import React, { useState } from 'react';
import { DraftMarkData, MarkContext, PoolLength, SwimmerProfile, WaterFeel } from '../../types';
import { getEventById } from '../../utils/events';
import { calculateFinaPoints } from '../../utils/fina';
import { formatSwimTime } from '../../utils/calculator';
import { FinaBadge } from '../../components/common/FinaBadge';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';

interface DraftMarkCardProps {
  draft: DraftMarkData;
  profile: SwimmerProfile;
  onConfirm: (finalData: DraftMarkData) => void;
}

export const DraftMarkCard: React.FC<DraftMarkCardProps> = ({
  draft,
  profile,
  onConfirm,
}) => {
  const [data, setData] = useState<DraftMarkData>({ ...draft });
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(draft.confirmed));

  const event = getEventById(data.eventId);
  const finaPoints = calculateFinaPoints(data.timeSec, data.eventId, data.poolLength, profile.gender);

  const handleTogglePool = (pool: PoolLength) => {
    if (isSaved) return;
    if (data.eventId === '100-medley' && pool === 50) return;
    setData((prev) => ({ ...prev, poolLength: pool }));
  };

  const handleToggleContext = (ctx: MarkContext) => {
    if (isSaved) return;
    setData((prev) => ({
      ...prev,
      context: ctx,
      timing: ctx === 'race' ? 'electronic' : 'manual',
    }));
  };

  const handleSetFeel = (val: WaterFeel) => {
    if (isSaved) return;
    setData((prev) => ({ ...prev, feel: prev.feel === val ? undefined : val }));
  };

  const handleSave = () => {
    if (isSaved) return;
    setIsSaved(true);
    onConfirm({ ...data, confirmed: true });
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-slate-50 dark:bg-slate-900 border border-cyan-500/30 p-3.5 shadow-md dark:shadow-lg shadow-cyan-950/5 dark:shadow-cyan-950/20 text-slate-900 dark:text-slate-100 flex flex-col gap-3 my-1">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-cyan-300 truncate">
            Propuesta de Marca
          </span>
        </div>
        <FinaBadge points={finaPoints} size="sm" />
      </div>

      {/* Detalle principal: Prueba y Tiempo */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-white leading-tight">
            {event.name}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono">
            {data.date} · {data.venue || 'Pileta'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black font-mono text-cyan-400">
            {formatSwimTime(data.timeSec)}
          </span>
        </div>
      </div>

      {/* Selectores táctiles de Pileta y Contexto */}
      {!isSaved ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Pileta */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => handleTogglePool(25)}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.poolLength === 25
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              25m
            </button>
            <button
              type="button"
              disabled={data.eventId === '100-medley'}
              onClick={() => handleTogglePool(50)}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.poolLength === 50
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              50m
            </button>
          </div>

          {/* Contexto */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => handleToggleContext('race')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.context === 'race'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Carrera
            </button>
            <button
              type="button"
              onClick={() => handleToggleContext('training')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.context === 'training'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrenamiento
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
            Pileta {data.poolLength}m
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {data.context === 'race' ? 'Carrera' : 'Entrenamiento'}
          </span>
        </div>
      )}

      {/* Sensación en el agua (1 a 5) */}
      {!isSaved && (
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Sensación (1-5):</span>
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4, 5] as WaterFeel[]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSetFeel(val)}
                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
                  data.feel === val
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botón de confirmación */}
      <div className="pt-1">
        {isSaved ? (
          <div className="w-full py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardada en Historial</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirmar y Guardar</span>
          </button>
        )}
      </div>
    </div>
  );
};

