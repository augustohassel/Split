import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MarkContext,
  MarkModality,
  PoolLength,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
  TimingMethod,
} from '../../types';
import {
  computeLapSplits,
  formatSwimTime,
  formatTimeDelta,
  getMarkPBStatus,
  getPersonalBestsForEvent,
} from '../../utils/calculator';
import {
  CONTEXT_LABELS,
  getEventById,
  getEventsForPool,
  MODALITY_LABELS,
  SWIM_EVENTS,
  TIMING_LABELS,
  WATER_FEEL_LABELS,
} from '../../utils/events';
import { calculateFinaPoints } from '../../utils/fina';
import { FinaBadge } from '../../components/common/FinaBadge';
import { PBBadge } from '../../components/common/PBBadge';
import {
  Edit3,
  Filter,
  LineChart as LineChartIcon,
  Split,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';

interface HistoryViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  initialEventId?: SwimEventId;
  initialPoolLength?: PoolLength;
  onEditMark: (mark: SwimMark) => void;
  onDeleteMark: (id: number) => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  profile,
  marks,
  goals,
  initialEventId,
  initialPoolLength,
  onEditMark,
  onDeleteMark,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<SwimEventId>(
    initialEventId ?? profile.favoriteEventIds?.[0] ?? '50-fly'
  );
  const [poolLength, setPoolLength] = useState<PoolLength>(
    initialPoolLength ?? profile.defaultPoolLength ?? 25
  );
  const [contextFilter, setContextFilter] = useState<MarkContext | 'all'>('all');
  const [modalityFilter, setModalityFilter] = useState<MarkModality | 'all'>('all');
  const [timingFilter, setTimingFilter] = useState<TimingMethod | 'all'>('all');
  const [chartMode, setChartMode] = useState<'evolution' | 'splits'>('evolution');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Sincronizar cuando se navega desde otra pestaña con prueba/pileta específica
  useEffect(() => {
    if (initialEventId) setSelectedEventId(initialEventId);
    if (initialPoolLength) setPoolLength(initialPoolLength);
  }, [initialEventId, initialPoolLength]);

  // Agrupar combinaciones de (eventId + poolLength) que tienen marcas cargadas
  const populatedEventPools = useMemo(() => {
    const map = new Map<
      string,
      { eventId: SwimEventId; poolLength: PoolLength; count: number; latestId: number }
    >();
    for (const m of marks) {
      const key = `${m.eventId}:${m.poolLength}`;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        prev.latestId = Math.max(prev.latestId, m.id ?? 0);
      } else {
        map.set(key, {
          eventId: m.eventId,
          poolLength: m.poolLength,
          count: 1,
          latestId: m.id ?? 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestId - a.latestId || b.count - a.count);
  }, [marks]);

  // Si la combinación actual no tiene marcas pero el usuario sí tiene marcas en otra prueba/pileta,
  // posicionarse automáticamente en la última prueba cargada para no mostrar "0 marcas" por error.
  useEffect(() => {
    if (marks.length === 0) return;
    const hasCurrent = marks.some(
      (m) => m.eventId === selectedEventId && m.poolLength === poolLength
    );
    if (!hasCurrent && populatedEventPools.length > 0) {
      setSelectedEventId(populatedEventPools[0].eventId);
      setPoolLength(populatedEventPools[0].poolLength);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks.length]);

  const currentEvent = getEventById(selectedEventId);

  const eventPBs = useMemo(
    () => getPersonalBestsForEvent(marks, selectedEventId, poolLength),
    [marks, selectedEventId, poolLength]
  );

  const activeGoal = useMemo(
    () => goals.find((g) => g.eventId === selectedEventId && g.poolLength === poolLength),
    [goals, selectedEventId, poolLength]
  );

  const filteredMarks = useMemo(() => {
    return marks
      .filter((m) => {
        if (m.eventId !== selectedEventId) return false;
        if (m.poolLength !== poolLength) return false;
        if (contextFilter !== 'all' && m.context !== contextFilter) return false;
        if (modalityFilter !== 'all' && m.modality !== modalityFilter) return false;
        if (timingFilter !== 'all' && m.timing !== timingFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }, [marks, selectedEventId, poolLength, contextFilter, modalityFilter, timingFilter]);

  const evolutionData = useMemo(() => {
    const chronological = [...filteredMarks].reverse();
    return chronological.map((m) => ({
      id: m.id,
      date: m.date.slice(5),
      fullDate: m.date,
      venue: m.venue,
      timeSec: m.timeSec,
      raceTimeSec: m.context === 'race' ? m.timeSec : null,
      trainingTimeSec: m.context === 'training' ? m.timeSec : null,
      finaPoints: calculateFinaPoints(m.timeSec, m.eventId, m.poolLength, profile.gender),
      contextLabel: m.context === 'race' ? 'Carrera' : 'Entrenamiento',
    }));
  }, [filteredMarks, profile.gender]);

  // Datos para comparativa de parciales entre PB Carrera, PB Entrenamiento, Última Marca y Objetivo
  const splitComparisonData = useMemo(() => {
    const raceLaps = eventPBs.racePB
      ? computeLapSplits(
          eventPBs.racePB.splits || [],
          eventPBs.racePB.timeSec,
          currentEvent.distance
        )
      : [];
    const trainingLaps = eventPBs.trainingPB
      ? computeLapSplits(
          eventPBs.trainingPB.splits || [],
          eventPBs.trainingPB.timeSec,
          currentEvent.distance
        )
      : [];
    const goalLaps =
      activeGoal && activeGoal.targetSplits && activeGoal.targetSplits.length > 0
        ? computeLapSplits(
            activeGoal.targetSplits,
            activeGoal.targetTimeSec,
            currentEvent.distance
          )
        : [];

    const labels = Array.from(
      new Set([
        ...raceLaps.map((l) => l.label),
        ...trainingLaps.map((l) => l.label),
        ...goalLaps.map((l) => l.label),
      ])
    );

    return labels.map((label) => {
      const r = raceLaps.find((l) => l.label === label);
      const t = trainingLaps.find((l) => l.label === label);
      const g = goalLaps.find((l) => l.label === label);
      return {
        segment: label,
        PB_Carrera: r?.lapTimeSec ?? null,
        PB_Entreno: t?.lapTimeSec ?? null,
        Objetivo: g?.lapTimeSec ?? null,
      };
    });
  }, [eventPBs, activeGoal, currentEvent.distance]);

  const availableEvents = getEventsForPool(poolLength);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          Evolución e Historial
        </h1>
        <p className="text-xs text-slate-400">
          Curvas temporales de marca y comparativa de parciales por prueba ({marks.length} marcas
          totales)
        </p>
      </div>

      {/* Acceso directo a las pruebas que tienen marcas cargadas */}
      {populatedEventPools.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tus Pruebas con Marcas Cargadas:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {populatedEventPools.map((item) => {
              const ev = getEventById(item.eventId);
              const isSelected =
                selectedEventId === item.eventId && poolLength === item.poolLength;
              return (
                <button
                  key={`${item.eventId}-${item.poolLength}`}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(item.eventId);
                    setPoolLength(item.poolLength);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{ev.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {item.poolLength}m · {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros Principales: Pileta y Prueba */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pileta</label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {([25, 50] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => {
                    setPoolLength(len);
                    if (len === 50 && selectedEventId === '100-medley') {
                      setSelectedEventId('200-medley');
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    poolLength === len
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {len}m
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="history-event-select"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Prueba Analizada
            </label>
            <select
              id="history-event-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value as SwimEventId)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
            >
              {availableEvents.map((ev) => {
                const count = marks.filter(
                  (m) => m.eventId === ev.id && m.poolLength === poolLength
                ).length;
                return (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} {count > 0 ? `(${count} marcas)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Filtros secundarios: Contexto, Modalidad y Cronometraje */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Contexto
            </label>
            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value as MarkContext | 'all')}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">Todos (Carrera + Entreno)</option>
              <option value="race">Solo Carrera / Torneo</option>
              <option value="training">Solo Entrenamiento</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Modalidad</label>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value as MarkModality | 'all')}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">Todas las modalidades</option>
              <option value="individual">Individual</option>
              <option value="relay_lead">Posta · 1er Relevo</option>
              <option value="relay_flying">Posta · Relevo Lanzado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Cronometraje</label>
            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value as TimingMethod | 'all')}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">Electrónico + Manual</option>
              <option value="electronic">Solo Electrónico / Placa</option>
              <option value="manual">Solo Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen de Récords Separados en la Prueba Seleccionada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase">
              <Trophy className="w-4 h-4 text-amber-400" />
              PB Oficial de Carrera (Principal)
            </span>
            {eventPBs.racePB && (
              <FinaBadge
                points={calculateFinaPoints(
                  eventPBs.racePB.timeSec,
                  selectedEventId,
                  poolLength,
                  profile.gender
                )}
                size="sm"
              />
            )}
          </div>
          {eventPBs.racePB ? (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-white">
                {formatSwimTime(eventPBs.racePB.timeSec)}
              </span>
              <span className="text-xs text-slate-400">
                {eventPBs.racePB.date} · {eventPBs.racePB.venue}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400 italic">
              Sin marcas de carrera con largada estática en {currentEvent.name} ({poolLength}m).
            </p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 border-teal-500/30 bg-teal-500/5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 uppercase">
              <Zap className="w-4 h-4 text-teal-400" />
              PB de Entrenamiento
            </span>
            {eventPBs.trainingPB && (
              <FinaBadge
                points={calculateFinaPoints(
                  eventPBs.trainingPB.timeSec,
                  selectedEventId,
                  poolLength,
                  profile.gender
                )}
                size="sm"
              />
            )}
          </div>
          {eventPBs.trainingPB ? (
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold font-mono text-slate-100">
                {formatSwimTime(eventPBs.trainingPB.timeSec)}
              </span>
              <span className="text-xs text-slate-400">
                {eventPBs.trainingPB.date} · {eventPBs.trainingPB.venue}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400 italic">
              Sin marcas de entrenamiento en {currentEvent.name} ({poolLength}m).
            </p>
          )}
        </div>
      </div>

      {/* Gráficos Recharts: Curva de Evolución y Comparativa de Parciales */}
      {evolutionData.length > 0 && (
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              {chartMode === 'evolution' ? (
                <>
                  <LineChartIcon className="w-4 h-4 text-cyan-400" />
                  <span>Curva de Evolución Temporal ({currentEvent.shortName})</span>
                </>
              ) : (
                <>
                  <Split className="w-4 h-4 text-cyan-400" />
                  <span>Comparativa de Tramos Parciales (*Splits*)</span>
                </>
              )}
            </h2>

            <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('evolution')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  chartMode === 'evolution'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tiempo Total
              </button>
              <button
                type="button"
                onClick={() => setChartMode('splits')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  chartMode === 'splits'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tramos Parciales
              </button>
            </div>
          </div>

          {chartMode === 'evolution' ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evolutionData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={['auto', 'auto']}
                    tickFormatter={(val: number) => formatSwimTime(val)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${formatSwimTime(value)}s`,
                      name === 'timeSec' ? 'Tiempo' : name,
                    ]}
                    labelFormatter={(_label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item
                        ? `${item.fullDate} · ${item.contextLabel} (${item.venue})`
                        : '';
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {activeGoal && (
                    <ReferenceLine
                      y={activeGoal.targetTimeSec}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: `Meta ${formatSwimTime(activeGoal.targetTimeSec)}`,
                        fill: '#10b981',
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="timeSec"
                    name="Evolución General"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#38bdf8' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="raceTimeSec"
                    name="Marca en Carrera"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 5, fill: '#fbbf24' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : splitComparisonData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={splitComparisonData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="segment" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${formatSwimTime(value)}s`, 'Tramo']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="PB_Carrera" name="PB Carrera" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="PB_Entreno"
                    name="PB Entrenamiento"
                    fill="#14b8a6"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar dataKey="Objetivo" name="Meta Tramo" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">
              Carga parciales en tus marcas de {currentEvent.name} para comparar tramos aquí.
            </p>
          )}
        </div>
      )}

      {/* Listado Detallado de Marcas con Parciales, Métricas y Edición/Borrado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Historial de Marcas ({filteredMarks.length})
          </h2>
          {SWIM_EVENTS.length > 0 && (
            <span className="text-xs text-slate-400">
              {currentEvent.name} · {poolLength}m
            </span>
          )}
        </div>

        {filteredMarks.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400">
            No se encontraron marcas para {currentEvent.name} ({poolLength}m) con los filtros
            seleccionados.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMarks.map((mark) => {
              const fina = calculateFinaPoints(
                mark.timeSec,
                mark.eventId,
                mark.poolLength,
                profile.gender
              );
              const pbStatus = getMarkPBStatus(mark, marks);
              const laps = computeLapSplits(
                mark.splits || [],
                mark.timeSec,
                currentEvent.distance
              );

              return (
                <div
                  key={mark.id ?? `${mark.date}-${mark.timeSec}`}
                  className="glass-card rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-extrabold font-mono text-white">
                          {formatSwimTime(mark.timeSec)}
                        </span>
                        <FinaBadge points={fina} size="sm" />
                        {pbStatus && <PBBadge type={pbStatus} />}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            CONTEXT_LABELS[mark.context].badgeClass
                          }`}
                        >
                          {CONTEXT_LABELS[mark.context].label}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{mark.date}</span>
                        <span>·</span>
                        <span className="text-slate-200 font-medium">{mark.venue}</span>
                        <span>·</span>
                        <span>{MODALITY_LABELS[mark.modality].shortLabel}</span>
                        <span>·</span>
                        <span>{TIMING_LABELS[mark.timing].shortLabel}</span>
                        {mark.feel && (
                          <>
                            <span>·</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                WATER_FEEL_LABELS[mark.feel].colorClass
                              }`}
                            >
                              {WATER_FEEL_LABELS[mark.feel].emoji}{' '}
                              {WATER_FEEL_LABELS[mark.feel].shortLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditMark(mark)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Editar marca"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {mark.id !== undefined && (
                        <>
                          {confirmDeleteId === mark.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteMark(mark.id!);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(mark.id!)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Eliminar marca"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tabla de Parciales Acumulados y Tramos */}
                  {laps.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                        Desglose de Parciales (*Splits*):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {laps.map((lap) => {
                          const goalLap = activeGoal?.targetSplits
                            ? computeLapSplits(
                                activeGoal.targetSplits,
                                activeGoal.targetTimeSec,
                                currentEvent.distance
                              ).find((gl) => gl.label === lap.label)
                            : undefined;

                          return (
                            <div
                              key={lap.label}
                              className="rounded-xl bg-slate-900/90 border border-slate-800 p-2 text-xs"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{lap.label}</span>
                                <span>@{lap.toDistance}m</span>
                              </div>
                              <div className="mt-0.5 flex items-baseline justify-between font-mono">
                                <span className="font-bold text-cyan-300">
                                  {formatSwimTime(lap.lapTimeSec)}s
                                </span>
                                <span className="text-[11px] text-slate-300">
                                  {formatSwimTime(lap.cumulativeTimeSec)}
                                </span>
                              </div>
                              {(lap.strokeCount !== undefined ||
                                lap.dolphinKicks !== undefined ||
                                goalLap !== undefined) && (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                                  {lap.strokeCount !== undefined && (
                                    <span>{lap.strokeCount} braz.</span>
                                  )}
                                  {lap.dolphinKicks !== undefined && (
                                    <span>{lap.dolphinKicks} ondas</span>
                                  )}
                                  {goalLap && (
                                    <span
                                      className={`font-mono ${
                                        lap.lapTimeSec <= goalLap.lapTimeSec
                                          ? 'text-emerald-400'
                                          : 'text-amber-300'
                                      }`}
                                    >
                                      {formatTimeDelta(lap.lapTimeSec - goalLap.lapTimeSec)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {mark.notes && (
                    <p className="text-xs text-slate-300 bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-800/70 italic">
                      “{mark.notes}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

