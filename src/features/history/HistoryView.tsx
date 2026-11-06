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
  ThemeMode,
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
  theme?: ThemeMode;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  profile,
  marks,
  goals,
  initialEventId,
  initialPoolLength,
  onEditMark,
  onDeleteMark,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const primaryStroke = isDark ? '#4fd8ec' : '#006876';
  const raceStroke = isDark ? '#fbbf24' : '#b45309';
  const goalStroke = isDark ? '#34d399' : '#047857';
  const trainingBarFill = isDark ? '#2dd4bf' : '#0f766e';
  const tooltipContentStyle = {
    backgroundColor: isDark ? '#131b2e' : '#ffffff',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    color: isDark ? '#f1f5f9' : '#0f172a',
    borderRadius: '12px',
    fontSize: '12px',
  };
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

  const currentEvent = getEventById(selectedEventId);

  // Identificar pruebas que efectivamente tienen registros para ofrecer acceso rápido
  const populatedEventPools = useMemo(() => {
    const map = new Map<string, { eventId: SwimEventId; poolLength: PoolLength; count: number }>();
    marks.forEach((m) => {
      const key = `${m.eventId}-${m.poolLength}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { eventId: m.eventId, poolLength: m.poolLength, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [marks]);

  // Filtrado de marcas para la prueba y pileta activas
  const filteredMarks = useMemo(() => {
    return marks
      .filter((m) => m.eventId === selectedEventId && m.poolLength === poolLength)
      .filter((m) => (contextFilter === 'all' ? true : m.context === contextFilter))
      .filter((m) => (modalityFilter === 'all' ? true : m.modality === modalityFilter))
      .filter((m) => (timingFilter === 'all' ? true : m.timing === timingFilter))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }, [marks, selectedEventId, poolLength, contextFilter, modalityFilter, timingFilter]);

  // Récords personales separados para la prueba/pileta analizada
  const eventPBs = useMemo(() => {
    return getPersonalBestsForEvent(marks, selectedEventId, poolLength);
  }, [marks, selectedEventId, poolLength]);

  // Objetivo activo para la prueba/pileta analizada
  const activeGoal = useMemo(() => {
    return goals.find((g) => g.eventId === selectedEventId && g.poolLength === poolLength);
  }, [goals, selectedEventId, poolLength]);

  // Serie de datos para la Curva de Evolución Temporal (cronológica ascendente)
  const evolutionData = useMemo(() => {
    return [...filteredMarks]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))
      .map((m) => {
        const fina = calculateFinaPoints(m.timeSec, m.eventId, m.poolLength, profile.gender);
        return {
          date: m.date.slice(5), // MM-DD para display compacto en eje X
          fullDate: m.date,
          timeSec: m.timeSec,
          raceTimeSec: m.context === 'race' ? m.timeSec : undefined,
          finaPoints: fina,
          venue: m.venue || 'Sin sede',
          contextLabel: CONTEXT_LABELS[m.context].label,
        };
      });
  }, [filteredMarks, profile.gender]);

  // Serie de datos para la Comparativa de Parciales (PB Carrera vs PB Entreno vs Objetivo)
  const splitComparisonData = useMemo(() => {
    const raceLaps = eventPBs.racePB?.splits
      ? computeLapSplits(eventPBs.racePB.splits, eventPBs.racePB.timeSec, currentEvent.distance)
      : [];

    const trainingLaps = eventPBs.trainingPB?.splits
      ? computeLapSplits(
          eventPBs.trainingPB.splits,
          eventPBs.trainingPB.timeSec,
          currentEvent.distance
        )
      : [];

    const goalLaps = activeGoal?.targetSplits
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
        <h1 className="text-xl font-extrabold text-on-surface tracking-tight">
          Evolución e Historial
        </h1>
        <p className="text-xs text-on-surface-variant">
          Curvas temporales de marca y comparativa de parciales por prueba ({marks.length} marcas
          totales)
        </p>
      </div>

      {/* Acceso directo a las pruebas que tienen marcas cargadas */}
      {populatedEventPools.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
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
                      ? 'bg-primary-md3 text-on-primary border-primary-md3 shadow-sm shadow-primary-md3/20'
                      : 'bg-surface-container text-on-surface-variant border-outline/50 hover:border-outline'
                  }`}
                >
                  <span>{ev.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-black/20 text-white' : 'bg-surface-container-high text-primary-md3'
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
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Pileta</label>
            <div className="grid grid-cols-2 gap-1.5 bg-surface-container p-1 rounded-xl border border-outline/50">
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
                      ? 'bg-primary-md3 text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
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
              className="block text-xs font-semibold text-on-surface-variant mb-1"
            >
              Prueba Analizada
            </label>
            <select
              id="history-event-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value as SwimEventId)}
              className="w-full rounded-xl bg-surface-container border border-outline px-3 py-2 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary-md3"
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
        <div className="pt-2 border-t border-outline/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] text-on-surface-variant mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Contexto
            </label>
            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value as MarkContext | 'all')}
              className="w-full rounded-lg bg-surface-container border border-outline/50 px-2.5 py-1.5 text-xs text-on-surface"
            >
              <option value="all">Todos (Carrera + Entreno)</option>
              <option value="race">Solo Carrera / Torneo</option>
              <option value="training">Solo Entrenamiento</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-on-surface-variant mb-1">Modalidad</label>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value as MarkModality | 'all')}
              className="w-full rounded-lg bg-surface-container border border-outline/50 px-2.5 py-1.5 text-xs text-on-surface"
            >
              <option value="all">Todas las modalidades</option>
              <option value="individual">Individual</option>
              <option value="relay_lead">Posta · 1er Relevo</option>
              <option value="relay_flying">Posta · Relevo Lanzado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-on-surface-variant mb-1">Cronometraje</label>
            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value as TimingMethod | 'all')}
              className="w-full rounded-lg bg-surface-container border border-outline/50 px-2.5 py-1.5 text-xs text-on-surface"
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
        <div className="glass-card rounded-2xl p-4 border-status-amber/30 bg-status-amber/5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-amber uppercase">
              <Trophy className="w-4 h-4 text-status-amber" />
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
              <span className="text-2xl font-extrabold font-mono text-on-surface">
                {formatSwimTime(eventPBs.racePB.timeSec)}
              </span>
              <span className="text-xs text-on-surface-variant">
                {eventPBs.racePB.date} · {eventPBs.racePB.venue}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-on-surface-variant italic">
              Sin marcas de carrera con largada estática en {currentEvent.name} ({poolLength}m).
            </p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 border-status-emerald/30 bg-status-emerald/5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-emerald uppercase">
              <Zap className="w-4 h-4 text-status-emerald" />
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
              <span className="text-2xl font-extrabold font-mono text-on-surface">
                {formatSwimTime(eventPBs.trainingPB.timeSec)}
              </span>
              <span className="text-xs text-on-surface-variant">
                {eventPBs.trainingPB.date} · {eventPBs.trainingPB.venue}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-on-surface-variant italic">
              Sin marcas de entrenamiento en {currentEvent.name} ({poolLength}m).
            </p>
          )}
        </div>
      </div>

      {/* Gráficos Recharts: Curva de Evolución y Comparativa de Parciales */}
      {evolutionData.length > 0 && (
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              {chartMode === 'evolution' ? (
                <>
                  <LineChartIcon className="w-4 h-4 text-primary-md3" />
                  <span>Curva de Evolución Temporal ({currentEvent.shortName})</span>
                </>
              ) : (
                <>
                  <Split className="w-4 h-4 text-primary-md3" />
                  <span>Comparativa de Tramos Parciales (*Splits*)</span>
                </>
              )}
            </h2>

            <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline/50 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('evolution')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  chartMode === 'evolution'
                    ? 'bg-primary-md3 text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tiempo Total
              </button>
              <button
                type="button"
                onClick={() => setChartMode('splits')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  chartMode === 'splits'
                    ? 'bg-primary-md3 text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
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
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="date" stroke={axisStroke} fontSize={11} />
                  <YAxis
                    stroke={axisStroke}
                    fontSize={11}
                    domain={['auto', 'auto']}
                    tickFormatter={(val: number) => formatSwimTime(val)}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
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
                      stroke={goalStroke}
                      strokeDasharray="4 4"
                      label={{
                        value: `Meta ${formatSwimTime(activeGoal.targetTimeSec)}`,
                        fill: goalStroke,
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="timeSec"
                    name="Evolución General"
                    stroke={primaryStroke}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: primaryStroke }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="raceTimeSec"
                    name="Marca en Carrera"
                    stroke={raceStroke}
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 5, fill: raceStroke }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="segment" stroke={axisStroke} fontSize={11} />
                  <YAxis
                    stroke={axisStroke}
                    fontSize={11}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v.toFixed(1)}s`}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value: number) => [`${formatSwimTime(value)}s`, 'Tramo']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="PB_Carrera" name="PB Carrera" fill={raceStroke} radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="PB_Entreno"
                    name="PB Entrenamiento"
                    fill={trainingBarFill}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar dataKey="Objetivo" name="Meta Tramo" fill={goalStroke} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant py-8 text-center">
              Carga parciales en tus marcas de {currentEvent.name} para comparar tramos aquí.
            </p>
          )}
        </div>
      )}

      {/* Listado Detallado de Marcas con Parciales, Métricas y Edición/Borrado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Historial de Marcas ({filteredMarks.length})
          </h2>
          {SWIM_EVENTS.length > 0 && (
            <span className="text-xs text-on-surface-variant">
              {currentEvent.name} · {poolLength}m
            </span>
          )}
        </div>

        {filteredMarks.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-on-surface-variant">
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
                        <span className="text-xl font-extrabold font-mono text-on-surface">
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

                      <div className="text-xs text-on-surface-variant mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{mark.date}</span>
                        <span>·</span>
                        <span className="text-on-surface font-medium">{mark.venue}</span>
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
                        className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface-variant transition-colors"
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
                              className="px-2.5 py-1.5 rounded-xl bg-status-rose text-white text-xs font-bold"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(mark.id!)}
                              className="p-2 rounded-xl bg-surface-container-high hover:bg-status-rose/20 text-on-surface-variant hover:text-status-rose transition-colors"
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
                    <div className="pt-2 border-t border-outline/40">
                      <div className="text-[11px] font-semibold text-on-surface-variant mb-1.5">
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
                              className="rounded-xl bg-surface-container border border-outline/50 p-2 text-xs"
                            >
                              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                                <span>{lap.label}</span>
                                <span>@{lap.toDistance}m</span>
                              </div>
                              <div className="mt-0.5 flex items-baseline justify-between font-mono">
                                <span className="font-bold text-primary-md3">
                                  {formatSwimTime(lap.lapTimeSec)}s
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {formatSwimTime(lap.cumulativeTimeSec)}
                                </span>
                              </div>
                              {(lap.strokeCount !== undefined ||
                                lap.dolphinKicks !== undefined ||
                                goalLap !== undefined) && (
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-on-surface-variant">
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
                                          ? 'text-status-emerald'
                                          : 'text-status-amber'
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
                    <p className="text-xs text-on-surface-variant bg-surface-container/60 rounded-xl px-3 py-2 border border-outline/40 italic">
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
