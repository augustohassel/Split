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
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Panel del Nadador
          </h1>
          <p className="text-xs text-slate-400">
            Récords separados en <span className="text-amber-300 font-medium">PB Carrera</span>{' '}
            (principal) y <span className="text-teal-300 font-medium">PB Entrenamiento</span>
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs">
          {(['all', 25, 50] as const).map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setPoolFilter(option)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                poolFilter === option
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option === 'all' ? '25m + 50m' : `${option}m`}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mejor FINA</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white">
              {topRanking ? topRanking.sortFinaPoints : '—'}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {topRanking
                ? `${getEventById(topRanking.eventId).shortName} (${topRanking.poolLength}m)`
                : 'Sin marcas aún'}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Marcas</span>
            <Waves className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white">{marks.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {raceMarksCount} carr. · {trainingMarksCount} entr.
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Objetivos</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold font-mono text-white">
              {goalAnalyses.filter((g) => g.achievedInRace).length}/{goalAnalyses.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cumplidos en carrera</div>
          </div>
        </div>
      </div>

      {/* Pruebas Favoritas: Comparativa PB Carrera (Principal) vs PB Entrenamiento */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Pruebas Favoritas · PB Carrera vs Entrenamiento
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('goals')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Configurar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{event.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
                    className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors"
                    title={`Registrar marca en ${event.name}`}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Separación explícita PB Carrera (Principal) y PB Entrenamiento */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 uppercase">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>PB Carrera</span>
                    </div>
                    {pbs.racePB ? (
                      <div className="mt-1">
                        <div className="text-lg font-extrabold font-mono text-white leading-tight">
                          {formatSwimTime(pbs.racePB.timeSec)}
                        </div>
                        <div className="text-[11px] font-mono text-amber-300/90 mt-0.5">
                          {raceFina} pts FINA
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500 italic">Sin marca</div>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-300 uppercase">
                      <Zap className="w-3 h-3 text-teal-400" />
                      <span>PB Entreno</span>
                    </div>
                    {pbs.trainingPB ? (
                      <div className="mt-1">
                        <div className="text-lg font-bold font-mono text-slate-200 leading-tight">
                          {formatSwimTime(pbs.trainingPB.timeSec)}
                        </div>
                        <div className="text-[11px] font-mono text-teal-300/80 mt-0.5">
                          {trainingFina} pts FINA
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500 italic">Sin marca</div>
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
            <Target className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Objetivos y Brecha Actual
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('goals')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5"
          >
            Gestionar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {goalAnalyses.length === 0 ? (
          <div className="glass-card rounded-2xl p-4 text-xs text-slate-400 flex items-center justify-between">
            <span>Aún no definiste tiempos objetivo por prueba y pileta.</span>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold"
            >
              Crear objetivo
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
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
                        <span className="font-bold text-white text-sm">{item.event.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.goal.poolLength}m
                        </span>
                        {item.goal.label && (
                          <span className="text-[11px] text-slate-400">· {item.goal.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Meta:</span>
                      <span className="font-mono font-extrabold text-sm text-emerald-300">
                        {formatSwimTime(item.goal.targetTimeSec)}
                      </span>
                      <FinaBadge points={item.targetFinaPoints} size="sm" />
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.achievedInRace
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                      }`}
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span>
                        <strong className="text-amber-300">PB Carrera:</strong>{' '}
                        {hasRacePB ? (
                          <span className="font-mono text-white">
                            {formatSwimTime(item.racePB!.timeSec)}{' '}
                            <span
                              className={
                                item.gapVsRacePBSec! <= 0 ? 'text-emerald-400' : 'text-amber-300'
                              }
                            >
                              ({formatTimeDelta(item.gapVsRacePBSec!)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Sin PB carrera</span>
                        )}
                      </span>

                      {item.trainingPB && (
                        <span className="text-slate-400">
                          <strong className="text-teal-300">PB Entreno:</strong>{' '}
                          <span className="font-mono text-slate-200">
                            {formatSwimTime(item.trainingPB.timeSec)} (
                            {formatTimeDelta(item.gapVsTrainingPBSec!)})
                          </span>
                        </span>
                      )}
                    </div>

                    {item.achievedInRace && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold">
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

      {/* Ranking Personal de Pruebas por Puntos FINA */}
      {ranking.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Ranking Personal por Puntos FINA
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Prioriza PB Carrera</span>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-slate-800/80">
            {ranking.map((row, index) => (
              <button
                key={`${row.eventId}-${row.poolLength}`}
                type="button"
                onClick={() => onNavigate('history', row.eventId, row.poolLength)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                      index === 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {row.eventName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {row.poolLength}m
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      {row.racePB && (
                        <span>
                          Carrera:{' '}
                          <strong className="font-mono text-amber-300">
                            {formatSwimTime(row.racePB.timeSec)}
                          </strong>
                        </span>
                      )}
                      {row.trainingPB && (
                        <span>
                          Entreno:{' '}
                          <strong className="font-mono text-teal-300">
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
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Últimas Marcas Cargadas
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5"
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
                        <span className="font-bold text-sm text-white">{event.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
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
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {mark.date} · {mark.venue || 'Sin sede'} ·{' '}
                        {MODALITY_LABELS[mark.modality].shortLabel}
                        {mark.feel && ` · ${WATER_FEEL_LABELS[mark.feel].emoji}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold font-mono text-white">
                        {formatSwimTime(mark.timeSec)}
                      </div>
                      <FinaBadge points={fina} size="sm" />
                    </div>
                  </div>

                  {laps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-800/70">
                      {laps.map((lap) => (
                        <span
                          key={lap.label}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800"
                        >
                          <span className="text-slate-500">{lap.label}:</span>{' '}
                          <strong className="text-cyan-300">
                            {formatSwimTime(lap.cumulativeTimeSec)}
                          </strong>{' '}
                          <span className="text-slate-400">({formatSwimTime(lap.lapTimeSec)})</span>
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
  );
};

