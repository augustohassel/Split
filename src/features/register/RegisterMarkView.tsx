import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  MarkContext,
  MarkModality,
  PoolLength,
  SplitEntry,
  SplitGranularity,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
  TimingMethod,
  WaterFeel,
} from '../../types';
import {
  checkNewPersonalBestCandidate,
  computeLapSplits,
  formatSwimTime,
  formatTimeDelta,
  isStaticStartModality,
  parseTimeInput,
} from '../../utils/calculator';
import {
  getAvailableSplitGranularities,
  getDefaultSplitGranularity,
  getEventById,
  getEventsForPool,
  getSplitCheckpoints,
  MODALITY_LABELS,
  TIMING_LABELS,
  WATER_FEEL_LABELS,
} from '../../utils/events';
import { calculateFinaPoints } from '../../utils/fina';
import { FinaBadge } from '../../components/common/FinaBadge';
import { PBBadge } from '../../components/common/PBBadge';
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Save,
  Sparkles,
  Split,
  Star,
  Timer,
  X,
} from 'lucide-react';

interface RegisterMarkViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  initialEventId?: SwimEventId;
  initialPoolLength?: PoolLength;
  editingMark?: SwimMark | null;
  onSaveMark: (mark: Omit<SwimMark, 'id'>, existingId?: number) => Promise<void>;
  onCancelEdit?: () => void;
}

interface SplitInputRow {
  cumulativeStr: string;
  strokeCountStr: string;
  dolphinKicksStr: string;
}

export const RegisterMarkView: React.FC<RegisterMarkViewProps> = ({
  profile,
  marks,
  goals,
  initialEventId,
  initialPoolLength,
  editingMark,
  onSaveMark,
  onCancelEdit,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [poolLength, setPoolLength] = useState<PoolLength>(
    editingMark?.poolLength ?? initialPoolLength ?? profile.defaultPoolLength ?? 25
  );

  const [eventId, setEventId] = useState<SwimEventId>(
    editingMark?.eventId ??
      initialEventId ??
      profile.favoriteEventIds?.[0] ??
      '50-fly'
  );

  const [totalTimeStr, setTotalTimeStr] = useState<string>(
    editingMark ? formatSwimTime(editingMark.timeSec) : ''
  );
  const [date, setDate] = useState<string>(editingMark?.date ?? todayStr);
  const [venue, setVenue] = useState<string>(editingMark?.venue ?? '');
  const [context, setContext] = useState<MarkContext>(editingMark?.context ?? 'race');
  const [modality, setModality] = useState<MarkModality>(editingMark?.modality ?? 'individual');
  const [timing, setTiming] = useState<TimingMethod>(editingMark?.timing ?? 'electronic');
  const [feel, setFeel] = useState<WaterFeel | undefined>(editingMark?.feel ?? 4);
  const [notes, setNotes] = useState<string>(editingMark?.notes ?? '');

  const currentEvent = getEventById(eventId);

  const [granularity, setGranularity] = useState<SplitGranularity>(
    editingMark?.splitGranularity ??
      getDefaultSplitGranularity(currentEvent.distance, poolLength)
  );
  const [include15mSplit, setInclude15mSplit] = useState<boolean>(
    editingMark?.include15mSplit ?? false
  );
  const [splitInputs, setSplitInputs] = useState<Record<number, SplitInputRow>>({});
  const [showTechnicalMetrics, setShowTechnicalMetrics] = useState<boolean>(
    Boolean(
      editingMark?.splits?.some(
        (s) => s.strokeCount !== undefined || s.dolphinKicks !== undefined
      )
    )
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Sincronizar si cambian las props iniciales o modo edición
  useEffect(() => {
    if (editingMark) {
      setPoolLength(editingMark.poolLength);
      setEventId(editingMark.eventId);
      setTotalTimeStr(formatSwimTime(editingMark.timeSec));
      setDate(editingMark.date);
      setVenue(editingMark.venue);
      setContext(editingMark.context);
      setModality(editingMark.modality);
      setTiming(editingMark.timing);
      setFeel(editingMark.feel);
      setNotes(editingMark.notes ?? '');
      const ev = getEventById(editingMark.eventId);
      setGranularity(
        editingMark.splitGranularity ??
          getDefaultSplitGranularity(ev.distance, editingMark.poolLength)
      );
      setInclude15mSplit(Boolean(editingMark.include15mSplit));

      const map: Record<number, SplitInputRow> = {};
      for (const s of editingMark.splits || []) {
        map[s.distance] = {
          cumulativeStr: formatSwimTime(s.cumulativeTimeSec),
          strokeCountStr: s.strokeCount !== undefined ? String(s.strokeCount) : '',
          dolphinKicksStr: s.dolphinKicks !== undefined ? String(s.dolphinKicks) : '',
        };
      }
      setSplitInputs(map);
    } else {
      if (initialPoolLength) setPoolLength(initialPoolLength);
      if (initialEventId) {
        setEventId(initialEventId);
        const ev = getEventById(initialEventId);
        setGranularity(
          getDefaultSplitGranularity(ev.distance, initialPoolLength ?? poolLength)
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMark, initialEventId, initialPoolLength]);

  // Si se cambia a pileta 50m y estaba en 100m Combinado (exclusivo 25m), pasar a 200m Combinado
  useEffect(() => {
    if (poolLength === 50 && eventId === '100-medley') {
      setEventId('200-medley');
    }
  }, [poolLength, eventId]);

  const handleSelectEvent = (newEventId: SwimEventId) => {
    setEventId(newEventId);
    const ev = getEventById(newEventId);
    setGranularity(getDefaultSplitGranularity(ev.distance, poolLength));
    setInclude15mSplit(false);
    setSplitInputs({});
  };

  const checkpoints = useMemo(
    () => getSplitCheckpoints(currentEvent.distance, granularity, include15mSplit),
    [currentEvent.distance, granularity, include15mSplit]
  );

  const parsedTotalSec = useMemo(() => parseTimeInput(totalTimeStr), [totalTimeStr]);

  // Construir arreglo de SplitEntry en vivo
  const liveSplitEntries = useMemo<SplitEntry[]>(() => {
    const entries: SplitEntry[] = [];
    for (const dist of checkpoints) {
      const row = splitInputs[dist];
      const rawTimeStr =
        dist === currentEvent.distance
          ? row?.cumulativeStr?.trim() || totalTimeStr
          : row?.cumulativeStr || '';
      const sec = parseTimeInput(rawTimeStr);
      if (sec !== null && sec > 0) {
        const strokeCount =
          row?.strokeCountStr && Number(row.strokeCountStr) > 0
            ? Math.round(Number(row.strokeCountStr))
            : undefined;
        const dolphinKicks =
          row?.dolphinKicksStr && Number(row.dolphinKicksStr) > 0
            ? Math.round(Number(row.dolphinKicksStr))
            : undefined;
        entries.push({
          distance: dist,
          cumulativeTimeSec: sec,
          strokeCount,
          dolphinKicks,
        });
      }
    }
    return entries;
  }, [checkpoints, splitInputs, currentEvent.distance, totalTimeStr]);

  const computedLaps = useMemo(
    () => computeLapSplits(liveSplitEntries, parsedTotalSec ?? undefined, currentEvent.distance),
    [liveSplitEntries, parsedTotalSec, currentEvent.distance]
  );

  const liveFinaPoints = useMemo(() => {
    if (!parsedTotalSec) return 0;
    return calculateFinaPoints(parsedTotalSec, eventId, poolLength, profile.gender);
  }, [parsedTotalSec, eventId, poolLength, profile.gender]);

  const pbCheck = useMemo(() => {
    if (!parsedTotalSec) return { isNewPB: false };
    return checkNewPersonalBestCandidate(
      parsedTotalSec,
      eventId,
      poolLength,
      context,
      modality,
      marks,
      editingMark?.id
    );
  }, [parsedTotalSec, eventId, poolLength, context, modality, marks, editingMark?.id]);

  const activeGoal = useMemo(
    () => goals.find((g) => g.eventId === eventId && g.poolLength === poolLength),
    [goals, eventId, poolLength]
  );

  const knownVenues = useMemo(() => {
    const set = new Set<string>();
    for (const m of marks) {
      if (m.venue?.trim()) set.add(m.venue.trim());
    }
    return Array.from(set);
  }, [marks]);

  const handleSplitChange = (
    dist: number,
    field: keyof SplitInputRow,
    val: string
  ) => {
    setSplitInputs((prev) => ({
      ...prev,
      [dist]: {
        cumulativeStr: prev[dist]?.cumulativeStr ?? '',
        strokeCountStr: prev[dist]?.strokeCountStr ?? '',
        dolphinKicksStr: prev[dist]?.dolphinKicksStr ?? '',
        [field]: val,
      },
    }));

    // Si edita el último parcial y el tiempo total estaba vacío, sincronizarlo
    if (dist === currentEvent.distance && field === 'cumulativeStr' && !totalTimeStr.trim()) {
      setTotalTimeStr(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedBanner(null);

    if (!parsedTotalSec || parsedTotalSec <= 0) {
      setErrorMsg('Ingresa un tiempo total válido (ej. 26.45 o 1:02.40).');
      return;
    }

    // Validar que los parciales acumulados sean crecientes y no superen el tiempo total
    let prevSec = 0;
    for (const entry of liveSplitEntries) {
      if (entry.cumulativeTimeSec <= prevSec) {
        setErrorMsg(
          `El parcial acumulado en ${entry.distance}m (${formatSwimTime(
            entry.cumulativeTimeSec
          )}) debe ser mayor al corte previo (${formatSwimTime(prevSec)}).`
        );
        return;
      }
      if (
        entry.distance < currentEvent.distance &&
        entry.cumulativeTimeSec >= parsedTotalSec
      ) {
        setErrorMsg(
          `El parcial en ${entry.distance}m (${formatSwimTime(
            entry.cumulativeTimeSec
          )}) debe ser menor al tiempo total (${formatSwimTime(parsedTotalSec)}).`
        );
        return;
      }
      prevSec = entry.cumulativeTimeSec;
    }

    // Asegurar que si hay parciales intermedios cargados, el corte final iguale el tiempo total
    const finalSplits: SplitEntry[] = [...liveSplitEntries];
    if (finalSplits.length > 0) {
      const lastIdx = finalSplits.findIndex((s) => s.distance === currentEvent.distance);
      const lastInput = splitInputs[currentEvent.distance];
      const finalEntry: SplitEntry = {
        distance: currentEvent.distance,
        cumulativeTimeSec: parsedTotalSec,
        strokeCount:
          lastInput?.strokeCountStr && Number(lastInput.strokeCountStr) > 0
            ? Math.round(Number(lastInput.strokeCountStr))
            : undefined,
        dolphinKicks:
          lastInput?.dolphinKicksStr && Number(lastInput.dolphinKicksStr) > 0
            ? Math.round(Number(lastInput.dolphinKicksStr))
            : undefined,
      };
      if (lastIdx >= 0) {
        finalSplits[lastIdx] = finalEntry;
      } else {
        finalSplits.push(finalEntry);
      }
    }

    const goalAchieved =
      activeGoal !== undefined &&
      isStaticStartModality(modality) &&
      parsedTotalSec <= activeGoal.targetTimeSec;

    await onSaveMark(
      {
        eventId,
        timeSec: parsedTotalSec,
        date,
        venue: venue.trim() || (context === 'race' ? 'Torneo Oficial' : 'Entrenamiento'),
        poolLength,
        context,
        modality,
        timing,
        splits: finalSplits,
        splitGranularity: granularity,
        include15mSplit,
        feel,
        notes: notes.trim() || undefined,
        createdAt: editingMark?.createdAt ?? new Date().toISOString(),
      },
      editingMark?.id
    );

    if (pbCheck.isNewPB || goalAchieved) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignorar en entornos sin canvas
      }
    }

    if (!editingMark) {
      const contextName = context === 'race' ? 'Carrera' : 'Entrenamiento';
      setSavedBanner(
        pbCheck.isNewPB
          ? `¡Marca guardada (${formatSwimTime(parsedTotalSec)})! Nuevo PB de ${contextName} (${liveFinaPoints} pts FINA).`
          : `Marca guardada correctamente: ${currentEvent.name} en ${formatSwimTime(
              parsedTotalSec
            )} (${liveFinaPoints} pts FINA).`
      );
      setTotalTimeStr('');
      setSplitInputs({});
      setNotes('');
    }
  };

  const availableEvents = getEventsForPool(poolLength);
  const availableGranularities = getAvailableSplitGranularities(currentEvent.distance);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            {editingMark ? 'Editar Marca' : 'Registrar Marca'}
          </h1>
          <p className="text-xs text-slate-400">
            Tiempo total, parciales acumulados, Puntos FINA y métricas por tramo
          </p>
        </div>

        {editingMark && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        )}
      </div>

      {savedBanner && (
        <div className="rounded-2xl p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl p-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Acceso rápido a Pruebas Favoritas */}
      {profile.favoriteEventIds?.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            Acceso Rápido · Pruebas Favoritas
          </label>
          <div className="flex flex-wrap gap-1.5">
            {profile.favoriteEventIds
              .filter((id) => getEventById(id).poolLengths.includes(poolLength))
              .map((favId) => {
                const ev = getEventById(favId);
                const selected = eventId === favId;
                return (
                  <button
                    key={favId}
                    type="button"
                    onClick={() => handleSelectEvent(favId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {ev.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Bloque Principal: Pileta, Prueba y Tiempo Total */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tamaño de Pileta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tamaño de Pileta
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {([25, 50] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setPoolLength(len)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    poolLength === len
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {len}m ({len === 25 ? 'Corta' : 'Olímpica'})
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Prueba (18 pruebas oficiales) */}
          <div className="sm:col-span-2">
            <label
              htmlFor="event-select"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Prueba Oficial ({availableEvents.length} disponibles en {poolLength}m)
            </label>
            <select
              id="event-select"
              value={eventId}
              onChange={(e) => handleSelectEvent(e.target.value as SwimEventId)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
            >
              {availableEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.strokeLabel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tiempo Total + Puntos FINA + Indicador PB en vivo */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label
              htmlFor="total-time-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
            >
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              Tiempo Total (mm:ss.cc o ss.cc)
            </label>
            <input
              id="total-time-input"
              type="text"
              inputMode="decimal"
              placeholder={currentEvent.distance === 50 ? 'Ej: 26.45' : 'Ej: 1:02.40'}
              value={totalTimeStr}
              onChange={(e) => setTotalTimeStr(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-cyan-500/40 px-4 py-3 text-xl font-extrabold font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Cálculo en vivo:</span>
              <FinaBadge points={liveFinaPoints} size="lg" />
            </div>

            {parsedTotalSec && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {pbCheck.isNewPB && (
                  <div className="flex items-center gap-1.5">
                    <PBBadge type={context === 'race' ? 'race-pb' : 'training-pb'} />
                    {pbCheck.improvementSec !== undefined && (
                      <span className="font-mono text-emerald-400 font-semibold">
                        (-{formatSwimTime(pbCheck.improvementSec)}s)
                      </span>
                    )}
                  </div>
                )}

                {!pbCheck.isNewPB && pbCheck.previousBestSec !== undefined && (
                  <span className="text-slate-400">
                    PB {context === 'race' ? 'Carrera' : 'Entreno'} actual:{' '}
                    <strong className="font-mono text-slate-200">
                      {formatSwimTime(pbCheck.previousBestSec)}
                    </strong>{' '}
                    ({formatTimeDelta(parsedTotalSec - pbCheck.previousBestSec)})
                  </span>
                )}

                {activeGoal && (
                  <span className="text-slate-400">
                    · Meta {formatSwimTime(activeGoal.targetTimeSec)}:{' '}
                    <strong
                      className={`font-mono ${
                        parsedTotalSec <= activeGoal.targetTimeSec
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {formatTimeDelta(parsedTotalSec - activeGoal.targetTimeSec)}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contexto, Modalidad, Cronometraje, Fecha y Sede */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Contexto: Carrera vs Entrenamiento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contexto de la Marca
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setContext('race')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  context === 'race'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏆 Carrera / Torneo
              </button>
              <button
                type="button"
                onClick={() => setContext('training')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  context === 'training'
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏊 Entrenamiento
              </button>
            </div>
          </div>

          {/* Cronometraje: Electrónico vs Manual */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Cronometraje
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              {(['electronic', 'manual'] as const).map((tm) => (
                <button
                  key={tm}
                  type="button"
                  onClick={() => setTiming(tm)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    timing === tm
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {TIMING_LABELS[tm].shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modalidad: Individual, Posta 1er Relevo, Posta Lanzada */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Modalidad (Largada estática vs. Relevo lanzado)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {(['individual', 'relay_lead', 'relay_flying'] as const).map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setModality(mod)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                  modality === mod
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <div>{MODALITY_LABELS[mod].shortLabel}</div>
                <div className="text-[10px] opacity-75">
                  {MODALITY_LABELS[mod].validForOfficialPB
                    ? 'Válida para PB'
                    : 'Partida en movimiento'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y Pileta/Sede */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="mark-date"
              className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Fecha
            </label>
            <input
              id="mark-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <label
              htmlFor="mark-venue"
              className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Pileta / Sede / Torneo
            </label>
            <input
              id="mark-venue"
              type="text"
              list="known-venues-list"
              placeholder="Ej: CENARD, Parque Olímpico, Club..."
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <datalist id="known-venues-list">
              {knownVenues.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Grilla Dinámica de Parciales Acumulados (Splits) */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Split className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Parciales Acumulados (*Splits*) — Opcional
              </h2>
              <p className="text-[11px] text-slate-400">
                Ingresa el tiempo acumulado en cada corte; el tramo se calcula solo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableGranularities.length > 1 && (
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                {availableGranularities.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={`px-2 py-1 rounded-md font-semibold ${
                      granularity === g
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cada {g}
                  </button>
                ))}
              </div>
            )}

            {(currentEvent.distance === 100 || currentEvent.distance === 200) && (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={include15mSplit}
                  onChange={(e) => setInclude15mSplit(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span>+15m</span>
              </label>
            )}

            <button
              type="button"
              onClick={() => setShowTechnicalMetrics((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                showTechnicalMetrics
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              + Brazadas / Ondas
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {checkpoints.map((dist, idx) => {
            const prevDist = idx === 0 ? 0 : checkpoints[idx - 1];
            const isFinal = dist === currentEvent.distance;
            const row = splitInputs[dist];
            const lapObj = computedLaps.find((l) => l.toDistance === dist);

            return (
              <div
                key={dist}
                className="grid grid-cols-12 gap-2 items-center rounded-xl bg-slate-900/75 border border-slate-800/90 px-3 py-2"
              >
                <div className="col-span-3 sm:col-span-3">
                  <div className="text-xs font-extrabold font-mono text-white">{dist}m</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Tramo {prevDist}-{dist}m
                  </div>
                </div>

                <div className={showTechnicalMetrics ? 'col-span-4' : 'col-span-5'}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={
                      isFinal && totalTimeStr
                        ? totalTimeStr
                        : dist === 15
                          ? 'Ej: 6.40'
                          : 'Acumulado'
                    }
                    value={row?.cumulativeStr ?? ''}
                    onChange={(e) => handleSplitChange(dist, 'cumulativeStr', e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {showTechnicalMetrics && (
                  <div className="col-span-3 grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="Braz."
                      title="Conteo de brazadas/ciclos en el tramo"
                      value={row?.strokeCountStr ?? ''}
                      onChange={(e) => handleSplitChange(dist, 'strokeCountStr', e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-1.5 py-1.5 text-[11px] font-mono text-slate-200 placeholder:text-slate-600"
                    />
                    <input
                      type="number"
                      min="0"
                      max="30"
                      placeholder="Ondas"
                      title="Ondas subacuáticas en el tramo"
                      value={row?.dolphinKicksStr ?? ''}
                      onChange={(e) => handleSplitChange(dist, 'dolphinKicksStr', e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-1.5 py-1.5 text-[11px] font-mono text-slate-200 placeholder:text-slate-600"
                    />
                  </div>
                )}

                <div
                  className={`${
                    showTechnicalMetrics ? 'col-span-2' : 'col-span-4'
                  } text-right font-mono`}
                >
                  {lapObj ? (
                    <div>
                      <span className="text-xs font-bold text-cyan-300">
                        +{formatSwimTime(lapObj.lapTimeSec)}
                      </span>
                      <div className="text-[10px] text-slate-500">tramo</div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sensación en el Agua (1-5) y Comentarios */}
      <div className="glass-card rounded-2xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Sensación en el Agua (1 a 5)
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as const).map((lvl) => {
              const info = WATER_FEEL_LABELS[lvl];
              const isSelected = feel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFeel(isSelected ? undefined : lvl)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all ${
                    isSelected
                      ? info.colorClass
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base">{info.emoji}</div>
                  <div className="text-[10px] font-semibold mt-0.5">{info.shortLabel}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="mark-notes" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Comentarios / Observaciones Técnicas
          </label>
          <textarea
            id="mark-notes"
            rows={2}
            placeholder="Ej: Subacuático hasta los 15m con 7 ondas, ajuste en viraje o respiración en cierre..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        <Save className="w-4 h-4" />
        <span>{editingMark ? 'Guardar Cambios en la Marca' : 'Registrar Marca'}</span>
        {pbCheck.isNewPB && <Sparkles className="w-4 h-4" />}
      </button>
    </form>
  );
};

