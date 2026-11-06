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
    <div className="w-full max-w-sm rounded-2xl bg-surface-container border border-primary-md3/30 p-3.5 shadow-md text-on-surface flex flex-col gap-3 my-1">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center justify-between gap-2 border-b border-outline/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-4 h-4 text-primary-md3 shrink-0" />
          <span className="text-xs font-bold text-primary-md3 truncate">
            Propuesta de Marca
          </span>
        </div>
        <FinaBadge points={finaPoints} size="sm" />
      </div>

      {/* Detalle principal: Prueba y Tiempo */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-on-surface leading-tight">
            {event.name}
          </h4>
          <p className="text-[11px] text-on-surface-variant font-mono">
            {data.date} · {data.venue || 'Pileta'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black font-mono text-primary-md3">
            {formatSwimTime(data.timeSec)}
          </span>
        </div>
      </div>

      {/* Selectores táctiles de Pileta y Contexto */}
      {!isSaved ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Pileta */}
          <div className="flex items-center gap-1 bg-surface-container-high p-0.5 rounded-lg border border-outline/50">
            <button
              type="button"
              onClick={() => handleTogglePool(25)}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.poolLength === 25
                  ? 'bg-primary-md3 text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
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
                  ? 'bg-primary-md3 text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              50m
            </button>
          </div>

          {/* Contexto */}
          <div className="flex items-center gap-1 bg-surface-container-high p-0.5 rounded-lg border border-outline/50">
            <button
              type="button"
              onClick={() => handleToggleContext('race')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.context === 'race'
                  ? 'bg-status-indigo text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Carrera
            </button>
            <button
              type="button"
              onClick={() => handleToggleContext('training')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
                data.context === 'training'
                  ? 'bg-status-emerald text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Entrenamiento
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
          <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline/50 font-mono">
            Pileta {data.poolLength}m
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline/50">
            {data.context === 'race' ? 'Carrera' : 'Entrenamiento'}
          </span>
        </div>
      )}

      {/* Sensación en el agua (1 a 5) */}
      {!isSaved && (
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>Sensación (1-5):</span>
          <div className="flex items-center gap-1">
            {([1, 2, 3, 4, 5] as WaterFeel[]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSetFeel(val)}
                className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
                  data.feel === val
                    ? 'bg-primary-md3 text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
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
          <div className="w-full py-1.5 rounded-xl bg-status-emerald/15 border border-status-emerald/30 text-status-emerald font-bold text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardada en Historial</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2 rounded-xl bg-primary-md3 hover:bg-primary-md3/90 text-on-primary font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary-md3/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirmar y Guardar</span>
          </button>
        )}
      </div>
    </div>
  );
};
