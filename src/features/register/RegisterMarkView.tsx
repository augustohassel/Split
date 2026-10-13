import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTab,
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
  getMarkPBStatus,
  isStaticStartModality,
  parseTimeInput,
} from '../../utils/calculator';
import {
  CONTEXT_LABELS,
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
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Edit3,
  MapPin,
  RotateCcw,
  Save,
  Sparkles,
  Split,
  Star,
  Timer,
  Trash2,
  X,
} from 'lucide-react';

interface RegisterMarkViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  initialEventId?: SwimEventId;
  initialPoolLength?: PoolLength;
  editingMark?: SwimMark | null;
  onSaveMark: (mark: Omit<SwimMark, 'id'>, existingId?: number) => Promise<SwimMark | void>;
  onCancelEdit?: () => void;
  onNavigate?: (tab: ActiveTab, eventId?: SwimEventId, poolLength?: PoolLength) => void;
  onEditMark?: (mark: SwimMark) => void;
  onDeleteMark?: (id: number) => Promise<void>;
}

interface SplitInputRow {
  cumulativeStr: string;
  strokeCountStr: string;
  dolphinKicksStr: string;
}

interface RegisterDraftState {
  poolLength: PoolLength;
  eventId: SwimEventId;
  totalTimeStr: string;
  date: string;
  venue: string;
  context: MarkContext;
  modality: MarkModality;
  timing: TimingMethod;
  feel?: WaterFeel;
  notes: string;
  granularity: SplitGranularity;
  include15mSplit: boolean;
  splitInputs: Record<number, SplitInputRow>;
  showTechnicalMetrics: boolean;
}

const REGISTER_DRAFT_KEY = 'split_register_draft_v1';

function readRegisterDraft(): Partial<RegisterDraftState> | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<RegisterDraftState>;
  } catch {
    return null;
  }
}

function writeRegisterDraft(draft: RegisterDraftState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignorar errores de almacenamiento
  }
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
  onNavigate,
  onEditMark,
  onDeleteMark,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const initialDraft = useMemo(() => (editingMark ? null : readRegisterDraft()), [editingMark]);

  const defaultPool: PoolLength =
    editingMark?.poolLength ??
    initialPoolLength ??
    initialDraft?.poolLength ??
    profile.defaultPoolLength ??
    25;

  const defaultEventId: SwimEventId =
    editingMark?.eventId ??
    initialEventId ??
    initialDraft?.eventId ??
    profile.favoriteEventIds?.[0] ??
    '50-fly';

  const [poolLength, setPoolLength] = useState<PoolLength>(defaultPool);
  const [eventId, setEventId] = useState<SwimEventId>(defaultEventId);

  const [totalTimeStr, setTotalTimeStr] = useState<string>(
    editingMark ? formatSwimTime(editingMark.timeSec) : (initialDraft?.totalTimeStr ?? '')
  );
  const [date, setDate] = useState<string>(
    editingMark?.date ?? initialDraft?.date ?? todayStr
  );
  const [venue, setVenue] = useState<string>(
    editingMark?.venue ?? initialDraft?.venue ?? ''
  );
  const [context, setContext] = useState<MarkContext>(
    editingMark?.context ?? initialDraft?.context ?? 'race'
  );
  const [modality, setModality] = useState<MarkModality>(
    editingMark?.modality ?? initialDraft?.modality ?? 'individual'
  );
  const [timing, setTiming] = useState<TimingMethod>(
    editingMark?.timing ?? initialDraft?.timing ?? 'electronic'
  );
  const [feel, setFeel] = useState<WaterFeel | undefined>(
    editingMark ? editingMark.feel : (initialDraft?.feel ?? 4)
  );
  const [notes, setNotes] = useState<string>(
    editingMark?.notes ?? initialDraft?.notes ?? ''
  );

  const currentEvent = getEventById(eventId);

  const [granularity, setGranularity] = useState<SplitGranularity>(
    editingMark?.splitGranularity ??
      initialDraft?.granularity ??
      getDefaultSplitGranularity(currentEvent.distance, poolLength)
  );
  const [include15mSplit, setInclude15mSplit] = useState<boolean>(
    editingMark?.include15mSplit ?? initialDraft?.include15mSplit ?? false
  );
  const [splitInputs, setSplitInputs] = useState<Record<number, SplitInputRow>>(
    initialDraft?.splitInputs ?? {}
  );
  const [showTechnicalMetrics, setShowTechnicalMetrics] = useState<boolean>(
    editingMark
      ? Boolean(
          editingMark.splits?.some(
            (s) => s.strokeCount !== undefined || s.dolphinKicks !== undefined
          )
        )
      : Boolean(initialDraft?.showTechnicalMetrics)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    eventName: string;
    eventId: SwimEventId;
    poolLength: PoolLength;
    timeSec: number;
    finaPoints: number;
    isNewPB: boolean;
    context: MarkContext;
    date: string;
    venue: string;
  } | null>(null);

  const totalTimeInputRef = useRef<HTMLInputElement | null>(null);
  const feedbackBoxRef = useRef<HTMLDivElement | null>(null);

  // Persistir borrador automáticamente en localStorage en cada cambio mientras no sea edición
  useEffect(() => {
    if (editingMark) return;
    writeRegisterDraft({
      poolLength,
      eventId,
      totalTimeStr,
      date,
      venue,
      context,
      modality,
      timing,
      feel,
      notes,
      granularity,
      include15mSplit,
      splitInputs,
      showTechnicalMetrics,
    });
  }, [
    editingMark,
    poolLength,
    eventId,
    totalTimeStr,
    date,
    venue,
    context,
    modality,
    timing,
    feel,
    notes,
    granularity,
    include15mSplit,
    splitInputs,
    showTechnicalMetrics,
  ]);

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
    setErrorMsg(null);
  };

  const handleClearDraft = () => {
    setTotalTimeStr('');
    setSplitInputs({});
    setNotes('');
    setVenue('');
    setErrorMsg(null);
    setSavedBanner(null);
    setLastSavedSummary(null);
  };

  const hasDraftData = useMemo(() => {
    if (editingMark) return false;
    const hasSplits = Object.values(splitInputs).some(
      (r) =>
        Boolean(r?.cumulativeStr?.trim()) ||
        Boolean(r?.strokeCountStr?.trim()) ||
        Boolean(r?.dolphinKicksStr?.trim())
    );
    return Boolean(totalTimeStr.trim()) || hasSplits || Boolean(notes.trim());
  }, [editingMark, totalTimeStr, splitInputs, notes]);

  const checkpoints = useMemo(
    () => getSplitCheckpoints(currentEvent.distance, granularity, include15mSplit),
    [currentEvent.distance, granularity, include15mSplit]
  );

  // Permitir que si Tiempo Total está vacío pero cargaron el último parcial, se tome de ahí
  const finalSplitRawStr = splitInputs[currentEvent.distance]?.cumulativeStr?.trim() || '';
  const parsedTotalSec = useMemo(() => {
    const direct = parseTimeInput(totalTimeStr);
    if (direct !== null && direct > 0) return direct;
    return parseTimeInput(finalSplitRawStr);
  }, [totalTimeStr, finalSplitRawStr]);

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

  const recentSavedMarks = useMemo(() => {
    return [...marks]
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0) || b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [marks]);

  const handleInsertColonInTotal = () => {
    setErrorMsg(null);
    if (!totalTimeStr.includes(':')) {
      setTotalTimeStr((prev) => `${prev}:`);
    }
    totalTimeInputRef.current?.focus();
  };

  const handleSplitChange = (
    dist: number,
    field: keyof SplitInputRow,
    val: string
  ) => {
    setErrorMsg(null);
    const prevFinalStr = splitInputs[dist]?.cumulativeStr ?? '';

    setSplitInputs((prev) => ({
      ...prev,
      [dist]: {
        cumulativeStr: prev[dist]?.cumulativeStr ?? '',
        strokeCountStr: prev[dist]?.strokeCountStr ?? '',
        dolphinKicksStr: prev[dist]?.dolphinKicksStr ?? '',
        [field]: val,
      },
    }));

    // Si edita el último parcial y el tiempo total estaba vacío o sincronizado con este campo, mantenerlo al día
    if (
      dist === currentEvent.distance &&
      field === 'cumulativeStr' &&
      (!totalTimeStr.trim() || totalTimeStr === prevFinalStr)
    ) {
      setTotalTimeStr(val);
    }
  };

  const scrollFeedbackIntoView = () => {
    setTimeout(() => {
      feedbackBoxRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedBanner(null);

    if (!parsedTotalSec || parsedTotalSec <= 0) {
      setErrorMsg(
        'Ingresa un tiempo total válido. Ejemplos: 26.45, 1:02.40 o con doble punto 1.02.40 (teclado numérico de celular).'
      );
      scrollFeedbackIntoView();
      return;
    }

    // Validar que los parciales acumulados intermedios sean crecientes y no superen el tiempo total
    let prevSec = 0;
    for (const entry of liveSplitEntries) {
      if (entry.distance === currentEvent.distance) {
        continue;
      }
      if (entry.cumulativeTimeSec <= prevSec) {
        setErrorMsg(
          `El parcial acumulado en ${entry.distance}m (${formatSwimTime(
            entry.cumulativeTimeSec
          )}) debe ser mayor al corte previo (${formatSwimTime(prevSec)}).`
        );
        scrollFeedbackIntoView();
        return;
      }
      if (entry.cumulativeTimeSec >= parsedTotalSec) {
        setErrorMsg(
          `El parcial en ${entry.distance}m (${formatSwimTime(
            entry.cumulativeTimeSec
          )}) debe ser menor al tiempo total (${formatSwimTime(parsedTotalSec)}).`
        );
        scrollFeedbackIntoView();
        return;
      }
      prevSec = entry.cumulativeTimeSec;
    }

    // Asegurar que si hay parciales intermedios cargados, el corte final iguale el tiempo total
    const finalSplits: SplitEntry[] = liveSplitEntries.filter(
      (s) => s.distance < currentEvent.distance
    );
    const lastInput = splitInputs[currentEvent.distance];
    const hasLastMetrics =
      Boolean(lastInput?.strokeCountStr && Number(lastInput.strokeCountStr) > 0) ||
      Boolean(lastInput?.dolphinKicksStr && Number(lastInput.dolphinKicksStr) > 0);

    if (finalSplits.length > 0 || hasLastMetrics) {
      finalSplits.push({
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
      });
    }

    const goalAchieved =
      activeGoal !== undefined &&
      isStaticStartModality(modality) &&
      parsedTotalSec <= activeGoal.targetTimeSec;

    const resolvedVenue =
      venue.trim() || (context === 'race' ? 'Torneo Oficial' : 'Entrenamiento');

    await onSaveMark(
      {
        eventId,
        timeSec: parsedTotalSec,
        date,
        venue: resolvedVenue,
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
      const msg = pbCheck.isNewPB
        ? `¡Marca guardada (${formatSwimTime(parsedTotalSec)})! Nuevo PB de ${contextName} (${liveFinaPoints} pts FINA).`
        : `¡Marca guardada con éxito! ${currentEvent.name} (${poolLength}m) en ${formatSwimTime(
            parsedTotalSec
          )} (${liveFinaPoints} pts FINA).`;

      setSavedBanner(msg);
      setLastSavedSummary({
        eventName: currentEvent.name,
        eventId,
        poolLength,
        timeSec: parsedTotalSec,
        finaPoints: liveFinaPoints,
        isNewPB: pbCheck.isNewPB,
        context,
        date,
        venue: resolvedVenue,
      });
      setTotalTimeStr('');
      setSplitInputs({});
      setNotes('');
      scrollFeedbackIntoView();
    }
  };

  const availableEvents = getEventsForPool(poolLength);
  const availableGranularities = getAvailableSplitGranularities(currentEvent.distance);
  const hasInvalidTotalInput = Boolean(totalTimeStr.trim()) && parsedTotalSec === null;

  return (
    <div className="space-y-6 pb-10">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {editingMark ? 'Editar Marca' : 'Registrar Marca'}
            </h1>
            <p className="text-xs text-slate-400">
              Tus datos se autoguardan mientras escribes · Compatible con teclado numérico móvil
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasDraftData && !editingMark && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
                  Borrador autoguardado
                </span>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                  title="Vaciar campos del formulario"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpiar
                </button>
              </div>
            )}

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
        </div>

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
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="total-time-input"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  Tiempo Total
                </label>
                <span className="text-[11px] text-cyan-300/90 font-mono">
                  {currentEvent.distance >= 100
                    ? 'Ej: 1.02.40 o 1:02.40'
                    : 'Ej: 26.45'}
                </span>
              </div>

              <div className="relative flex items-center gap-1.5">
                <input
                  ref={totalTimeInputRef}
                  id="total-time-input"
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    currentEvent.distance === 50 ? 'Ej: 26.45' : 'Ej: 1.02.40 o 1:02.40'
                  }
                  value={totalTimeStr}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setTotalTimeStr(e.target.value);
                  }}
                  className={`w-full rounded-xl bg-slate-950 border px-4 py-3 text-xl font-extrabold font-mono text-white placeholder:text-slate-600 focus:outline-none ${
                    hasInvalidTotalInput
                      ? 'border-rose-500 focus:border-rose-400'
                      : 'border-cyan-500/40 focus:border-cyan-400'
                  }`}
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertColonInTotal}
                  className="shrink-0 px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950 border border-slate-700 text-cyan-300 font-mono font-extrabold text-lg leading-none transition-colors"
                  title="Insertar dos puntos (:) para separar minutos y segundos"
                >
                  :
                </button>
              </div>

              <div className="text-[11px] leading-snug">
                {parsedTotalSec ? (
                  <span className="text-emerald-300 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Tiempo interpretado:{' '}
                    <strong className="font-mono text-white">
                      {formatSwimTime(parsedTotalSec)}
                    </strong>{' '}
                    ({parsedTotalSec.toFixed(2)}s)
                  </span>
                ) : hasInvalidTotalInput ? (
                  <span className="text-rose-300 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    Formato inválido (segundos de 00 a 59). Usa <strong>1.02.40</strong>,{' '}
                    <strong>1:02.40</strong> o <strong>62.40</strong>.
                  </span>
                ) : (
                  <span className="text-slate-400">
                    En celular puedes usar <strong>doble punto</strong> (<code>1.02.40</code>), el
                    botón <code>:</code> o segundos (<code>62.40</code>).
                  </span>
                )}
              </div>
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
                  Acepta formato con doble punto (ej. 1.02.40) o dos puntos (1:02.40)
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
                    <div className="text-xs font-extrabold font-mono text-white">
                      {dist}m {isFinal && <span className="text-[10px] text-cyan-400">(Final)</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Tramo {prevDist}-{dist}m
                    </div>
                  </div>

                  <div
                    className={`${
                      showTechnicalMetrics ? 'col-span-4' : 'col-span-5'
                    } flex items-center gap-1`}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={
                        isFinal && parsedTotalSec
                          ? formatSwimTime(parsedTotalSec)
                          : dist === 15
                            ? 'Ej: 6.40'
                            : 'Acumulado'
                      }
                      value={row?.cumulativeStr ?? ''}
                      onChange={(e) => handleSplitChange(dist, 'cumulativeStr', e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                    />
                    {dist >= 100 && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const cur = row?.cumulativeStr ?? '';
                          if (!cur.includes(':')) {
                            handleSplitChange(dist, 'cumulativeStr', `${cur}:`);
                          }
                        }}
                        className="shrink-0 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs border border-slate-700"
                        title="Insertar :"
                      >
                        :
                      </button>
                    )}
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
            <label
              htmlFor="mark-notes"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
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

        {/* Zona de Feedback inmediato junto al botón de envío (visible en móvil sin necesidad de subir) */}
        <div ref={feedbackBoxRef} className="space-y-3">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl p-4 bg-rose-500/20 border-2 border-rose-500/60 text-rose-100 text-xs flex items-start gap-2.5 shadow-lg"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-200">No se pudo guardar la marca:</div>
                <div>{errorMsg}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>{editingMark ? 'Guardar Cambios en la Marca' : 'Registrar Marca'}</span>
            {pbCheck.isNewPB && <Sparkles className="w-4 h-4" />}
          </button>

          {/* Tarjeta destacada de confirmación inmediata al guardar */}
          {savedBanner && lastSavedSummary && (
            <div
              role="status"
              className="rounded-2xl p-4 bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-100 space-y-3 shadow-lg shadow-emerald-950/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-extrabold text-white">
                      ¡Marca guardada en tu dispositivo!
                    </div>
                    <p className="text-xs text-emerald-200/90 mt-0.5">{savedBanner}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSavedBanner(null);
                    setLastSavedSummary(null);
                  }}
                  className="text-emerald-300/70 hover:text-white p-1"
                  title="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {lastSavedSummary.eventName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {lastSavedSummary.poolLength}m
                    </span>
                    {lastSavedSummary.isNewPB && (
                      <PBBadge
                        type={lastSavedSummary.context === 'race' ? 'race-pb' : 'training-pb'}
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {lastSavedSummary.date} · {lastSavedSummary.venue}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold font-mono text-emerald-300">
                    {formatSwimTime(lastSavedSummary.timeSec)}
                  </span>
                  <FinaBadge points={lastSavedSummary.finaPoints} size="sm" />
                </div>
              </div>

              {onNavigate && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        'history',
                        lastSavedSummary.eventId,
                        lastSavedSummary.poolLength
                      )
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ver en Historial y Gráficos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
                  >
                    Ir al Inicio
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Resumen de marcas guardadas en el dispositivo para confirmación visual permanente */}
      {!editingMark && recentSavedMarks.length > 0 && (
        <section className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Marcas Guardadas en tu Dispositivo ({marks.length})
              </h2>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('history', eventId, poolLength)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {recentSavedMarks.map((mark) => {
              const ev = getEventById(mark.eventId);
              const fina = calculateFinaPoints(
                mark.timeSec,
                mark.eventId,
                mark.poolLength,
                profile.gender
              );
              const pbStatus = getMarkPBStatus(mark, marks);

              return (
                <div
                  key={mark.id ?? `${mark.date}-${mark.timeSec}`}
                  className="glass-card rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white">{ev.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {mark.poolLength}m
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          CONTEXT_LABELS[mark.context].badgeClass
                        }`}
                      >
                        {mark.context === 'race' ? 'Carrera' : 'Entreno'}
                      </span>
                      {pbStatus && <PBBadge type={pbStatus} />}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {mark.date} · {mark.venue}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-white">
                        {formatSwimTime(mark.timeSec)}
                      </div>
                      <FinaBadge points={fina} size="sm" />
                    </div>

                    {onEditMark && (
                      <button
                        type="button"
                        onClick={() => onEditMark(mark)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Editar marca"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteMark && mark.id !== undefined && (
                      <button
                        type="button"
                        onClick={() => onDeleteMark(mark.id!)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                        title="Eliminar marca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

