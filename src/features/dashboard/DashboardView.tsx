import React, { useState } from 'react';
import {
  ActiveTab,
  PoolLength,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
} from '../../types';
import {
  analyzeGoalGap,
  buildEventFinaRanking,
  computeLapSplits,
  formatSwimTime,
  formatTimeDelta,
  getMarkPBStatus,
  getPersonalBestsForEvent,
} from '../../utils/calculator';
import {
  CONTEXT_LABELS,
  getEventById,
  MODALITY_LABELS,
  STROKE_META,
  WATER_FEEL_LABELS,
} from '../../utils/events';
import { calculateFinaPoints } from '../../utils/fina';
import { FinaBadge } from '../../components/common/FinaBadge';
import { PBBadge } from '../../components/common/PBBadge';
import {
  Award,
  ChevronRight,
  PlusCircle,
  Star,
  Target,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  onNavigate: (tab: ActiveTab, preselectedEventId?: SwimEventId, poolLength?: PoolLength) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  marks,
  goals,
  onNavigate,
}) => {
  const [poolFilter, setPoolFilter] = useState<PoolLength | 'all'>('all');

  const ranking = buildEventFinaRanking(marks, profile.gender, poolFilter);
  const bestRaceRanking = ranking.find((r) => r.racePB);
  const topRanking = bestRaceRanking ?? ranking[0];

  const raceMarksCount = marks.filter((m) => m.context === 'race').length;
  const trainingMarksCount = marks.filter((m) => m.context === 'training').length;

  const goalAnalyses = goals
    .filter((g) => poolFilter === 'all' || g.poolLength === poolFilter)
    .map((g) => analyzeGoalGap(g, marks, profile.gender));

  const recentMarks = [...marks]
    .filter((m) => poolFilter === 'all' || m.poolLength === poolFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 5);

  const favoriteIds: SwimEventId[] =
    profile.favoriteEventIds && profile.favoriteEventIds.length > 0
      ? profile.favoriteEventIds
      : ['50-fly'];

  return (
    <div className="space-y-6 pb-8">
      {/* Filtro superior de pileta y acceso rápido */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-on-surface tracking-tight">
            Panel del Nadador
          </h1>
          <p className="text-xs text-on-surface-variant">
            Récords separados en <span className="text-status-amber font-medium">PB Carrera</span>{' '}
            (principal) y <span className="text-status-emerald font-medium">PB Entrenamiento</span>
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline/50 text-xs">
          {(['all', 25, 50] as const).map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setPoolFilter(option)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                poolFilter === option
                  ? 'bg-primary-md3 text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option === 'all' ? '25m + 50m' : `${option}m`}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Mejor FINA</span>
            <Award className="w-4 h-4 text-status-amber" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-on-surface">
              {topRanking ? topRanking.sortFinaPoints : '—'}
            </div>
            <div className="text-[11px] text-on-surface-variant truncate mt-0.5">
              {topRanking
                ? `${getEventById(topRanking.eventId).shortName} (${topRanking.poolLength}m)`
                : 'Sin marcas aún'}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Marcas</span>
            <Waves className="w-4 h-4 text-primary-md3" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-on-surface">{marks.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              {raceMarksCount} carr. · {trainingMarksCount} entr.
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Objetivos</span>
            <Target className="w-4 h-4 text-status-emerald" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-on-surface">
              {goalAnalyses.filter((g) => g.achievedInRace).length}/{goalAnalyses.length}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">Cumplidos en carrera</div>
          </div>
        </div>
      </div>

      {/* Pruebas Favoritas: Comparativa PB Carrera (Principal) vs PB Entrenamiento */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-status-amber fill-status-amber" />
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
              Pruebas Favoritas · PB Carrera vs Entrenamiento
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('goals')}
            className="text-xs text-primary-md3 hover:text-primary-md3/80 font-medium"
          >
            Configurar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {favoriteIds.map((eventId) => {
            const event = getEventById(eventId);
            const activePool: PoolLength =
              poolFilter === 'all'
                ? event.poolLengths.includes(profile.defaultPoolLength)
                ? profile.defaultPoolLength
                : event.poolLengths[0]
                : event.poolLengths.includes(poolFilter)
                ? poolFilter
                : event.poolLengths[0];

            const pbs = getPersonalBestsForEvent(marks, eventId, activePool);
            const raceFina = pbs.racePB
              ? calculateFinaPoints(pbs.racePB.timeSec, eventId, activePool, profile.gender)
              : null;
            const trainingFina = pbs.trainingPB
              ? calculateFinaPoints(pbs.trainingPB.timeSec, eventId, activePool, profile.gender)
              : null;

            return (
              <div
                key={`${eventId}-${activePool}`}
                className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-outline transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-sm">{event.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline/50">
                        {activePool}m
                      </span>
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${
                        STROKE_META[event.stroke].badgeClass
                      }`}
                    >
                      {event.strokeLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('register', eventId, activePool)}
                    className="p-2 rounded-xl bg-primary-md3/15 hover:bg-primary-md3/25 text-primary-md3 border border-primary-md3/30 transition-colors"
                    title={`Registrar marca en ${event.name}`}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Separación explícita PB Carrera (Principal) y PB Entrenamiento */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline/40">
                  <div className="rounded-xl bg-status-amber/10 border border-status-amber/25 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-status-amber uppercase">
                      <Trophy className="w-3 h-3 text-status-amber" />
                      <span>PB Carrera</span>
                    </div>
                    {pbs.racePB ? (
                      <div className="mt-1">
                        <div className="text-lg font-extrabold font-mono text-on-surface leading-tight">
                          {formatSwimTime(pbs.racePB.timeSec)}
                        </div>
                        <div className="text-[11px] font-mono text-status-amber mt-0.5">
                          {raceFina} pts FINA
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-on-surface-variant italic">Sin marca</div>
                    )}
                  </div>

                  <div className="rounded-xl bg-surface-container border border-outline/50 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-status-emerald uppercase">
                      <Zap className="w-3 h-3 text-status-emerald" />
                      <span>PB Entreno</span>
                    </div>
                    {pbs.trainingPB ? (
                      <div className="mt-1">
                        <div className="text-lg font-bold font-mono text-on-surface leading-tight">
                          {formatSwimTime(pbs.trainingPB.timeSec)}
                        </div>
                        <div className="text-[11px] font-mono text-status-emerald mt-0.5">
                          {trainingFina} pts FINA
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-on-surface-variant italic">Sin marca</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Brecha hacia Objetivos Activos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-status-emerald" />
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
              Objetivos y Brecha Actual
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('goals')}
            className="text-xs text-primary-md3 hover:text-primary-md3/80 font-medium flex items-center gap-0.5"
          >
            Gestionar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {goalAnalyses.length === 0 ? (
          <div className="glass-card rounded-2xl p-4 text-xs text-on-surface-variant flex items-center justify-between">
            <span>Aún no definiste tiempos objetivo por prueba y pileta.</span>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-primary-md3 font-semibold"
            >
              Crear objetivo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goalAnalyses.map((item) => {
              const hasRacePB = item.racePB !== undefined;
              return (
                <div
                  key={item.goal.id ?? `${item.goal.eventId}-${item.goal.poolLength}`}
                  className="glass-card rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface text-sm">{item.event.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                          {item.goal.poolLength}m
                        </span>
                        {item.goal.label && (
                          <span className="text-[11px] text-on-surface-variant">· {item.goal.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant">Meta:</span>
                      <span className="font-mono font-extrabold text-sm text-status-emerald">
                        {formatSwimTime(item.goal.targetTimeSec)}
                      </span>
                      <FinaBadge points={item.targetFinaPoints} size="sm" />
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.achievedInRace
                          ? 'bg-status-emerald'
                          : 'bg-gradient-to-r from-primary-md3 to-status-indigo'
                      }`}
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span>
                        <strong className="text-status-amber">PB Carrera:</strong>{' '}
                        {hasRacePB ? (
                          <span className="font-mono text-on-surface">
                            {formatSwimTime(item.racePB!.timeSec)}{' '}
                            <span
                              className={
                                item.gapVsRacePBSec! <= 0 ? 'text-status-emerald' : 'text-status-amber'
                              }
                            >
                              ({formatTimeDelta(item.gapVsRacePBSec!)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">Sin PB carrera</span>
                        )}
                      </span>

                      {item.trainingPB && (
                        <span className="text-on-surface-variant">
                          <strong className="text-status-emerald">PB Entreno:</strong>{' '}
                          <span className="font-mono text-on-surface">
                            {formatSwimTime(item.trainingPB.timeSec)} (
                            {formatTimeDelta(item.gapVsTrainingPBSec!)})
                          </span>
                        </span>
                      )}
                    </div>

                    {item.achievedInRace && (
                      <span className="px-2 py-0.5 rounded-full bg-status-emerald/15 text-status-emerald border border-status-emerald/40 text-[11px] font-semibold">
                        ¡Objetivo cumplido en Carrera!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ranking Personal y Últimas Marcas en grilla de 2 columnas en escritorio */}
      {(ranking.length > 0 || recentMarks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ranking Personal de Pruebas por Puntos FINA */}
          {ranking.length > 0 && (
            <section
              className={`space-y-3 ${
                recentMarks.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary-md3" />
                  <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                    Ranking Personal por Puntos FINA
                  </h2>
                </div>
                <span className="text-[11px] text-on-surface-variant">Prioriza PB Carrera</span>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-outline/40">
                {ranking.map((row, index) => (
                  <button
                    key={`${row.eventId}-${row.poolLength}`}
                    type="button"
                    onClick={() => onNavigate('history', row.eventId, row.poolLength)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-container-high/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          index === 0
                            ? 'bg-status-amber/15 text-status-amber border border-status-amber/40'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-on-surface truncate">
                            {row.eventName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                            {row.poolLength}m
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mt-0.5">
                          {row.racePB && (
                            <span>
                              Carrera:{' '}
                              <strong className="font-mono text-status-amber">
                                {formatSwimTime(row.racePB.timeSec)}
                              </strong>
                            </span>
                          )}
                          {row.trainingPB && (
                            <span>
                              Entreno:{' '}
                              <strong className="font-mono text-status-emerald">
                                {formatSwimTime(row.trainingPB.timeSec)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <PBBadge type={row.primaryContext === 'race' ? 'race-pb' : 'training-pb'} />
                      <FinaBadge points={row.sortFinaPoints} size="md" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Últimas Marcas Registradas */}
          {recentMarks.length > 0 && (
            <section
              className={`space-y-3 ${
                ranking.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                  Últimas Marcas Cargadas
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="text-xs text-primary-md3 hover:text-primary-md3/80 font-medium flex items-center gap-0.5"
                >
                  Ver historial <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {recentMarks.map((mark) => {
                  const event = getEventById(mark.eventId);
                  const fina = calculateFinaPoints(
                    mark.timeSec,
                    mark.eventId,
                    mark.poolLength,
                    profile.gender
                  );
                  const pbStatus = getMarkPBStatus(mark, marks);
                  const laps = computeLapSplits(mark.splits || [], mark.timeSec, event.distance);

                  return (
                    <div
                      key={mark.id ?? `${mark.date}-${mark.timeSec}`}
                      className="glass-card rounded-2xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-on-surface">{event.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              {mark.poolLength}m
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                CONTEXT_LABELS[mark.context].badgeClass
                              }`}
                            >
                              {mark.context === 'race' ? 'Carrera' : 'Entrenamiento'}
                            </span>
                            {pbStatus && <PBBadge type={pbStatus} />}
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">
                            {mark.date} · {mark.venue || 'Sin sede'} ·{' '}
                            {MODALITY_LABELS[mark.modality].shortLabel}
                            {mark.feel && ` · ${WATER_FEEL_LABELS[mark.feel].emoji}`}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-extrabold font-mono text-on-surface">
                            {formatSwimTime(mark.timeSec)}
                          </div>
                          <FinaBadge points={fina} size="sm" />
                        </div>
                      </div>

                      {laps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-outline/40">
                          {laps.map((lap) => (
                            <span
                              key={lap.label}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant border border-outline/50"
                            >
                              <span className="text-on-surface-variant/80">{lap.label}:</span>{' '}
                              <strong className="text-primary-md3">
                                {formatSwimTime(lap.cumulativeTimeSec)}
                              </strong>{' '}
                              <span className="text-on-surface-variant/80">
                                ({formatSwimTime(lap.lapTimeSec)})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
