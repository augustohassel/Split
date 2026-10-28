import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  PoolLength,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
} from './types';
import {
  clearAllData,
  deleteGoalFromDb,
  deleteMarkFromDb,
  ensureDefaultProfile,
  exportDatabaseAsJson,
  exportMarksAsCsv,
  getStoreState,
  importDatabaseFromJson,
  loadDemoDataset,
  LocalDatabaseMirror,
  saveGoalToDb,
  saveMarkToDb,
  updateProfileInDb,
} from './db';
import { formatSwimTime } from './utils/calculator';
import { getEventById } from './utils/events';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './features/dashboard/DashboardView';
import { RegisterMarkView } from './features/register/RegisterMarkView';
import { HistoryView } from './features/history/HistoryView';
import { GoalsAndSettingsView } from './features/goals/GoalsAndSettingsView';
import { ChatView } from './features/chat/ChatView';
import { useTheme } from './hooks/useTheme';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

const NAV_STATE_KEY = 'split_nav_state_v1';

interface PersistedNavState {
  activeTab: ActiveTab;
  selectedEventId?: SwimEventId;
  selectedPoolLength?: PoolLength;
}

function readNavState(): PersistedNavState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedNavState;
  } catch {
    return null;
  }
}

function writeNavState(state: PersistedNavState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const App: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const initialNav = useMemo(() => readNavState(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialNav?.activeTab ?? 'dashboard'
  );
  const [selectedEventId, setSelectedEventId] = useState<SwimEventId | undefined>(
    initialNav?.selectedEventId
  );
  const [selectedPoolLength, setSelectedPoolLength] = useState<PoolLength | undefined>(
    initialNav?.selectedPoolLength
  );
  const [editingMark, setEditingMark] = useState<SwimMark | null>(null);
  const [dbState, setDbState] = useState<LocalDatabaseMirror>(() => getStoreState());
  const [toast, setToast] = useState<{
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const refreshStore = useCallback(() => {
    setDbState(getStoreState());
  }, []);

  useEffect(() => {
    void ensureDefaultProfile().then(() => {
      refreshStore();
    });
  }, [refreshStore]);

  useEffect(() => {
    writeNavState({
      activeTab,
      selectedEventId,
      selectedPoolLength,
    });
  }, [activeTab, selectedEventId, selectedPoolLength]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const { profile, marks, goals } = dbState;

  const handleNavigate = (
    tab: ActiveTab,
    eventId?: SwimEventId,
    poolLength?: PoolLength
  ) => {
    if (eventId) setSelectedEventId(eventId);
    if (poolLength) setSelectedPoolLength(poolLength);
    if (tab !== 'register') {
      setEditingMark(null);
    }
    setActiveTab(tab);
  };

  const handleSaveMark = async (
    markData: Omit<SwimMark, 'id'>,
    existingId?: number
  ): Promise<SwimMark> => {
    const saved = await saveMarkToDb(markData, existingId);
    refreshStore();
    setSelectedEventId(markData.eventId);
    setSelectedPoolLength(markData.poolLength);

    const ev = getEventById(markData.eventId);
    if (existingId !== undefined) {
      setEditingMark(null);
      setActiveTab('history');
      setToast({
        message: `Marca actualizada: ${ev.name} (${markData.poolLength}m) — ${formatSwimTime(
          markData.timeSec
        )}`,
      });
    } else {
      setToast({
        message: `¡Marca guardada! ${ev.name} (${markData.poolLength}m) — ${formatSwimTime(
          markData.timeSec
        )}`,
        actionLabel: 'Ver Historial',
        onAction: () => {
          handleNavigate('history', markData.eventId, markData.poolLength);
          setToast(null);
        },
      });
    }
    return saved;
  };

  const handleEditMark = (mark: SwimMark) => {
    setEditingMark(mark);
    setSelectedEventId(mark.eventId);
    setSelectedPoolLength(mark.poolLength);
    setActiveTab('register');
  };

  const handleDeleteMark = async (id: number) => {
    await deleteMarkFromDb(id);
    refreshStore();
    setToast({ message: 'Marca eliminada del dispositivo.' });
  };

  const handleUpdateProfile = async (updated: SwimmerProfile) => {
    const saved = await updateProfileInDb(updated);
    refreshStore();
    setToast({
      message: `¡Perfil FINA guardado! (${saved.name} · ${
        saved.gender === 'male' ? 'Hombre' : 'Mujer'
      } · Pileta ${saved.defaultPoolLength}m)`,
    });
  };

  const handleSaveGoal = async (goalData: Omit<SwimGoal, 'id'>) => {
    await saveGoalToDb(goalData);
    refreshStore();
    const ev = getEventById(goalData.eventId);
    setToast({
      message: `¡Objetivo guardado! ${ev.name} (${goalData.poolLength}m): ${formatSwimTime(
        goalData.targetTimeSec
      )}`,
    });
  };

  const handleDeleteGoal = async (id: number) => {
    await deleteGoalFromDb(id);
    refreshStore();
    setToast({ message: 'Objetivo eliminado.' });
  };

  const handleExportJson = async () => {
    const json = await exportDatabaseAsJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(json, `split-backup-${dateStr}.json`, 'application/json;charset=utf-8');
    setToast({ message: 'Archivo de respaldo JSON descargado.' });
  };

  const handleImportJson = async (file: File) => {
    const text = await file.text();
    const res = await importDatabaseFromJson(text);
    refreshStore();
    setToast({
      message: `Backup restaurado: ${res.marksImported} marcas y ${res.goalsImported} objetivos.`,
    });
    return res;
  };

  const handleExportCsv = () => {
    const csv = exportMarksAsCsv(marks, profile.gender);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(csv, `split-marcas-${dateStr}.csv`, 'text/csv;charset=utf-8');
    setToast({ message: 'Planilla CSV descargada.' });
  };

  const handleLoadDemo = async () => {
    const res = await loadDemoDataset();
    refreshStore();
    setToast({
      message: `Datos de demostración cargados (${res.marksAdded} marcas y ${res.goalsAdded} objetivos).`,
    });
    return res;
  };

  const handleClearAllData = async (resetProfile = false) => {
    await clearAllData(resetProfile);
    refreshStore();
    setToast({
      message: resetProfile
        ? 'Se borraron todas las marcas, objetivos y se restableció el perfil.'
        : 'Se borraron todas las marcas y objetivos del dispositivo.',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Header
        profile={profile}
        onSelectTab={(tab) => handleNavigate(tab)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Toast flotante de confirmación inmediata en la parte inferior de la pantalla */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/60 px-4 py-3 shadow-2xl shadow-slate-900/15 dark:shadow-slate-950/90 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
              {toast.message}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={toast.onAction}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1"
              >
                <span>{toast.actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-24">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            marks={marks}
            goals={goals}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'register' && (
          <RegisterMarkView
            profile={profile}
            marks={marks}
            goals={goals}
            initialEventId={selectedEventId}
            initialPoolLength={selectedPoolLength}
            editingMark={editingMark}
            onSaveMark={handleSaveMark}
            onCancelEdit={() => {
              setEditingMark(null);
              setActiveTab('history');
            }}
            onNavigate={handleNavigate}
            onEditMark={handleEditMark}
            onDeleteMark={handleDeleteMark}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            profile={profile}
            marks={marks}
            goals={goals}
            onSaveMark={handleSaveMark}
            onSaveGoal={handleSaveGoal}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            profile={profile}
            marks={marks}
            goals={goals}
            initialEventId={selectedEventId}
            initialPoolLength={selectedPoolLength}
            onEditMark={handleEditMark}
            onDeleteMark={handleDeleteMark}
            theme={theme}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsAndSettingsView
            profile={profile}
            marks={marks}
            goals={goals}
            onUpdateProfile={handleUpdateProfile}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onExportCsv={handleExportCsv}
            onLoadDemo={handleLoadDemo}
            onClearAllData={handleClearAllData}
            onNavigate={handleNavigate}
            theme={theme}
            onSelectTheme={setTheme}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        marksCount={marks.length}
      />
    </div>
  );
};

export default App;
