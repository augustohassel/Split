import React, { useMemo, useRef, useState } from 'react';
import {
  PoolLength,
  SplitEntry,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerGender,
  SwimmerProfile,
} from '../../types';
import {
  analyzeGoalGap,
  computeLapSplits,
  formatSwimTime,
  formatTimeDelta,
  parseTimeInput,
} from '../../utils/calculator';
import {
  getDefaultSplitGranularity,
  getEventById,
  getEventsForPool,
  getSplitCheckpoints,
  SWIM_EVENTS,
} from '../../utils/events';
import { calculateFinaPoints, FINA_TABLE_VERSION, getFinaBaseTime } from '../../utils/fina';
import { FinaBadge } from '../../components/common/FinaBadge';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Plus,
  Save,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

interface GoalsAndSettingsViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  onUpdateProfile: (updated: SwimmerProfile) => Promise<void>;
  onSaveGoal: (goal: Omit<SwimGoal, 'id'>) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
  onExportJson: () => Promise<void>;
  onImportJson: (file: File) => Promise<{ marksImported: number; goalsImported: number }>;
  onExportCsv: () => void;
  onLoadDemo: () => Promise<{ marksAdded: number; goalsAdded: number }>;
  onClearAllData: (resetProfile?: boolean) => Promise<void>;
}

export const GoalsAndSettingsView: React.FC<GoalsAndSettingsViewProps> = ({
  profile,
  marks,
  goals,
  onUpdateProfile,
  onSaveGoal,
  onDeleteGoal,
  onExportJson,
  onImportJson,
  onExportCsv,
  onLoadDemo,
  onClearAllData,
}) => {
  const [subTab, setSubTab] = useState<'goals' | 'profile' | 'backup'>('goals');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmClearMode, setConfirmClearMode] = useState<'none' | 'marks' | 'all'>('none');

  // Estado formulario de Objetivo
  const [goalPoolLength, setGoalPoolLength] = useState<PoolLength>(profile.defaultPoolLength);
  const [goalEventId, setGoalEventId] = useState<SwimEventId>(
    profile.favoriteEventIds?.[0] ?? '50-fly'
  );
  const [goalTimeStr, setGoalTimeStr] = useState<string>('');
  const [goalLabel, setGoalLabel] = useState<string>('');
  const [showGoalSplits, setShowGoalSplits] = useState<boolean>(false);
  const [goalSplitInputs, setGoalSplitInputs] = useState<Record<number, string>>({});

  // Estado formulario de Perfil
  const [name, setName] = useState<string>(profile.name);
  const [gender, setGender] = useState<SwimmerGender>(profile.gender);
  const [category, setCategory] = useState<string>(profile.category ?? '');
  const [club, setClub] = useState<string>(profile.club ?? '');
  const [defaultPoolLength, setDefaultPoolLength] = useState<PoolLength>(
    profile.defaultPoolLength
  );
  const [favoriteEventIds, setFavoriteEventIds] = useState<SwimEventId[]>(
    profile.favoriteEventIds?.length ? profile.favoriteEventIds : ['50-fly']
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentGoalEvent = getEventById(goalEventId);
  const goalCheckpoints = useMemo(
    () =>
      getSplitCheckpoints(
        currentGoalEvent.distance,
        getDefaultSplitGranularity(currentGoalEvent.distance, goalPoolLength)
      ),
    [currentGoalEvent.distance, goalPoolLength]
  );

  const parsedGoalSec = useMemo(() => parseTimeInput(goalTimeStr), [goalTimeStr]);
  const liveGoalFina = useMemo(
    () =>
      parsedGoalSec
        ? calculateFinaPoints(parsedGoalSec, goalEventId, goalPoolLength, profile.gender)
        : 0,
    [parsedGoalSec, goalEventId, goalPoolLength, profile.gender]
  );

  const goalAnalyses = useMemo(
    () => goals.map((g) => analyzeGoalGap(g, marks, profile.gender)),
    [goals, marks, profile.gender]
  );

  const handleLoadExistingGoalIntoForm = (g: SwimGoal) => {
    setGoalPoolLength(g.poolLength);
    setGoalEventId(g.eventId);
    setGoalTimeStr(formatSwimTime(g.targetTimeSec));
    setGoalLabel(g.label ?? '');
    if (g.targetSplits && g.targetSplits.length > 0) {
      setShowGoalSplits(true);
      const map: Record<number, string> = {};
      for (const s of g.targetSplits) {
        map[s.distance] = formatSwimTime(s.cumulativeTimeSec);
      }
      setGoalSplitInputs(map);
    } else {
      setShowGoalSplits(false);
      setGoalSplitInputs({});
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusBanner(null);

    if (!parsedGoalSec || parsedGoalSec <= 0) {
      setErrorMsg('Ingresa un tiempo objetivo válido (ej. 26.20 o 58.50).');
      return;
    }

    const targetSplits: SplitEntry[] = [];
    if (showGoalSplits) {
      for (const dist of goalCheckpoints) {
        const raw =
          dist === currentGoalEvent.distance
            ? goalSplitInputs[dist]?.trim() || goalTimeStr
            : goalSplitInputs[dist] || '';
        const sec = parseTimeInput(raw);
        if (sec && sec > 0) {
          targetSplits.push({ distance: dist, cumulativeTimeSec: sec });
        }
      }
    }

    await onSaveGoal({
      eventId: goalEventId,
      poolLength: goalPoolLength,
      targetTimeSec: parsedGoalSec,
      targetSplits: targetSplits.length > 0 ? targetSplits : undefined,
      label: goalLabel.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });

    setStatusBanner(
      `Objetivo guardado para ${currentGoalEvent.name} (${goalPoolLength}m): ${formatSwimTime(
        parsedGoalSec
      )} (${liveGoalFina} pts FINA).`
    );
    setGoalTimeStr('');
    setGoalLabel('');
    setGoalSplitInputs({});
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusBanner(null);

    const safeFavs: SwimEventId[] =
      favoriteEventIds.length > 0 ? favoriteEventIds : ['50-fly'];

    await onUpdateProfile({
      ...profile,
      name: name.trim() || 'Nadador',
      gender,
      category: category.trim() || undefined,
      club: club.trim() || undefined,
      defaultPoolLength,
      favoriteEventIds: safeFavs,
      updatedAt: new Date().toISOString(),
    });

    setStatusBanner('Perfil del nadador y preferencias actualizadas correctamente.');
  };

  const toggleFavoriteEvent = (id: SwimEventId) => {
    setFavoriteEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await onImportJson(file);
      setStatusBanner(
        `Restauración completada: ${res.marksImported} marcas y ${res.goalsImported} objetivos importados.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al importar el archivo JSON.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Objetivos y Ajustes
          </h1>
          <p className="text-xs text-slate-400">
            Metas por prueba y pileta, perfil FINA y respaldo offline
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setSubTab('goals')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              subTab === 'goals'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Objetivos</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              subTab === 'profile'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil FINA</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('backup')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${
              subTab === 'backup'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Datos</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="rounded-2xl p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl p-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* SUBTAB 1: OBJETIVOS */}
      {subTab === 'goals' && (
        <div className="space-y-5">
          <form onSubmit={handleGoalSubmit} className="glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                Definir o Actualizar Objetivo
              </h2>
              {parsedGoalSec && <FinaBadge points={liveGoalFina} size="sm" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pileta
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {([25, 50] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => {
                        setGoalPoolLength(len);
                        if (len === 50 && goalEventId === '100-medley') {
                          setGoalEventId('200-medley');
                        }
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold ${
                        goalPoolLength === len
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prueba Oficial
                </label>
                <select
                  value={goalEventId}
                  onChange={(e) => setGoalEventId(e.target.value as SwimEventId)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  {getEventsForPool(goalPoolLength).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tiempo Meta (mm:ss.cc o ss.cc)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 26.20"
                  value={goalTimeStr}
                  onChange={(e) => setGoalTimeStr(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-emerald-500/40 px-3 py-2 text-base font-extrabold font-mono text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Etiqueta / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marca mínima Nacional, Sub-26..."
                  value={goalLabel}
                  onChange={(e) => setGoalLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowGoalSplits((v) => !v)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {showGoalSplits
                  ? '− Ocultar parciales objetivo'
                  : '+ Configurar parciales objetivo opcionales'}
              </button>

              {showGoalSplits && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {goalCheckpoints.map((dist) => (
                    <div
                      key={dist}
                      className="rounded-xl bg-slate-900 border border-slate-800 p-2"
                    >
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Paso {dist}m
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={
                          dist === currentGoalEvent.distance ? goalTimeStr || 'Final' : 'Acum.'
                        }
                        value={goalSplitInputs[dist] ?? ''}
                        onChange={(e) =>
                          setGoalSplitInputs((prev) => ({ ...prev, [dist]: e.target.value }))
                        }
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar Objetivo
            </button>
          </form>

          {/* Lista de Objetivos Activos con Brecha contra PB Carrera, PB Entrenamiento y Última Marca */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Objetivos Configurados ({goalAnalyses.length})
            </h2>

            {goalAnalyses.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-xs text-slate-400">
                No tienes objetivos activos todavía. Usa el formulario superior para definir tu
                primera meta.
              </div>
            ) : (
              <div className="space-y-3">
                {goalAnalyses.map((item) => {
                  const goalLaps =
                    item.goal.targetSplits && item.goal.targetSplits.length > 0
                      ? computeLapSplits(
                          item.goal.targetSplits,
                          item.goal.targetTimeSec,
                          item.event.distance
                        )
                      : [];

                  return (
                    <div
                      key={item.goal.id ?? `${item.goal.eventId}-${item.goal.poolLength}`}
                      className="glass-card rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-white">
                              {item.event.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.goal.poolLength}m
                            </span>
                            {item.goal.label && (
                              <span className="text-xs text-slate-400">· {item.goal.label}</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Tiempo Meta:</span>
                            <span className="text-lg font-extrabold font-mono text-emerald-300">
                              {formatSwimTime(item.goal.targetTimeSec)}
                            </span>
                            <FinaBadge points={item.targetFinaPoints} size="sm" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadExistingGoalIntoForm(item.goal)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-medium"
                          >
                            Editar
                          </button>
                          {item.goal.id !== undefined && (
                            <button
                              type="button"
                              onClick={() => onDeleteGoal(item.goal.id!)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                              title="Eliminar objetivo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comparativa de Brechas: PB Carrera (Prioritario), PB Entrenamiento y Última Marca */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5">
                          <div className="text-[10px] font-bold text-amber-300 uppercase">
                            Vs. PB Carrera (Principal)
                          </div>
                          {item.racePB ? (
                            <div className="mt-1 flex items-baseline justify-between font-mono">
                              <span className="text-white font-bold">
                                {formatSwimTime(item.racePB.timeSec)}
                              </span>
                              <span
                                className={
                                  item.gapVsRacePBSec! <= 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-amber-300 font-semibold'
                                }
                              >
                                {formatTimeDelta(item.gapVsRacePBSec!)}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-slate-500 italic">Sin PB Carrera</div>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5">
                          <div className="text-[10px] font-bold text-teal-300 uppercase">
                            Vs. PB Entrenamiento
                          </div>
                          {item.trainingPB ? (
                            <div className="mt-1 flex items-baseline justify-between font-mono">
                              <span className="text-slate-200 font-bold">
                                {formatSwimTime(item.trainingPB.timeSec)}
                              </span>
                              <span
                                className={
                                  item.gapVsTrainingPBSec! <= 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-teal-300'
                                }
                              >
                                {formatTimeDelta(item.gapVsTrainingPBSec!)}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-slate-500 italic">Sin PB Entreno</div>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Vs. Última Marca
                          </div>
                          {item.latestMark ? (
                            <div className="mt-1 flex items-baseline justify-between font-mono">
                              <span className="text-slate-200 font-bold">
                                {formatSwimTime(item.latestMark.timeSec)}
                              </span>
                              <span
                                className={
                                  item.gapVsLatestSec! <= 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-slate-300'
                                }
                              >
                                {formatTimeDelta(item.gapVsLatestSec!)}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 text-slate-500 italic">Sin registros</div>
                          )}
                        </div>
                      </div>

                      {goalLaps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {goalLaps.map((lap) => (
                            <span
                              key={lap.label}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                            >
                              Meta {lap.label}:{' '}
                              <strong className="text-emerald-300">
                                {formatSwimTime(lap.cumulativeTimeSec)}
                              </strong>{' '}
                              ({formatSwimTime(lap.lapTimeSec)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PERFIL DEL NADADOR Y PUNTOS FINA */}
      {subTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="glass-card rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              Perfil del Nadador &amp; Parámetros FINA
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre o Apodo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Género Deportivo (Tablas World Aquatics)
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2 rounded-lg text-xs font-bold ${
                      gender === 'male'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Hombre
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2 rounded-lg text-xs font-bold ${
                      gender === 'female'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mujer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoría (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juvenil, Primera, Master 30-34..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pileta Habitual Predeterminada
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {([25, 50] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setDefaultPoolLength(len)}
                      className={`py-2 rounded-lg text-xs font-bold ${
                        defaultPoolLength === len
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Club / Equipo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre de tu club o equipo..."
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Selección de Pruebas Favoritas */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Pruebas Favoritas ({favoriteEventIds.length} seleccionadas)
                </label>
                <span className="text-[11px] text-slate-400">
                  Tiempos base: {FINA_TABLE_VERSION}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SWIM_EVENTS.map((ev) => {
                  const isFav = favoriteEventIds.includes(ev.id);
                  const baseSec = getFinaBaseTime(ev.id, defaultPoolLength, gender);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleFavoriteEvent(ev.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isFav
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{ev.shortName}</span>
                        {isFav && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                      </div>
                      {baseSec && (
                        <div className="text-[10px] font-mono opacity-75">
                          Base {defaultPoolLength}m: {formatSwimTime(baseSec)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar Perfil y Pruebas Favoritas
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 3: RESPALDO, RESTAURACIÓN Y DEMO */}
      {subTab === 'backup' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Respaldo y Portabilidad Offline (JSON / CSV)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todos tus datos se almacenan de forma 100% privada en tu dispositivo mediante
              IndexedDB. Puedes descargar una copia completa en JSON para respaldo o exportar tu
              planilla de marcas en CSV.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onExportJson}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-semibold text-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Backup JSON
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar Backup JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={onExportCsv}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-semibold text-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Marcas CSV
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 space-y-3 border border-amber-500/25">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Datos de Demostración
            </h2>
            <p className="text-xs text-slate-400">
              Carga un conjunto de marcas y objetivos de ejemplo (50m y 100m Mariposa/Libre en
              Carrera y Entrenamiento con parciales de 15m, 25m y 35m) para explorar gráficos y
              rankings.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await onLoadDemo();
                setStatusBanner(
                  `Se cargaron ${res.marksAdded} marcas de demostración y ${res.goalsAdded} objetivos.`
                );
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-xs transition-colors"
            >
              Cargar Conjunto de Demostración
            </button>
          </div>

          <div className="glass-card rounded-2xl p-4 space-y-3 border border-rose-500/30 bg-rose-950/10">
            <h2 className="text-sm font-bold text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Zona de Peligro · Borrar todos los datos
            </h2>
            <p className="text-xs text-slate-400">
              Elimina todas las marcas ({marks.length}) y objetivos ({goals.length}) guardados en
              este dispositivo, o restablece también el perfil del nadador a los valores de fábrica.
            </p>

            {confirmClearMode === 'none' ? (
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmClearMode('marks')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-semibold text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Borrar marcas y objetivos
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmClearMode('all')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 font-semibold text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Restablecer app de fábrica (Todo)
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-950/90 border border-rose-500/40 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-rose-200">
                  {confirmClearMode === 'all'
                    ? '¿Confirmas eliminar TODAS las marcas, objetivos y restablecer tu perfil de nadador?'
                    : `¿Confirmas eliminar las ${marks.length} marcas y ${goals.length} objetivos? (Tu perfil se mantendrá).`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const resetProfile = confirmClearMode === 'all';
                      await onClearAllData(resetProfile);
                      setConfirmClearMode('none');
                      setStatusBanner(
                        resetProfile
                          ? 'Se han borrado todos los datos y restablecido el perfil inicial.'
                          : 'Se han borrado todas las marcas y objetivos correctamente.'
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors"
                  >
                    Sí, borrar ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearMode('none')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

