import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ActiveTab,
  PoolLength,
  SwimEventId,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
} from './types';
import {
  db,
  ensureDefaultProfile,
  exportDatabaseAsJson,
  exportMarksAsCsv,
  importDatabaseFromJson,
  loadDemoDataset,
} from './db';
import { DEFAULT_SWIMMER_PROFILE } from './db/seeds';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './features/dashboard/DashboardView';
import { RegisterMarkView } from './features/register/RegisterMarkView';
import { HistoryView } from './features/history/HistoryView';
import { GoalsAndSettingsView } from './features/goals/GoalsAndSettingsView';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<SwimEventId | undefined>(undefined);
  const [selectedPoolLength, setSelectedPoolLength] = useState<PoolLength | undefined>(undefined);
  const [editingMark, setEditingMark] = useState<SwimMark | null>(null);

  useEffect(() => {
    void ensureDefaultProfile();
  }, []);

  const profiles = useLiveQuery(() => db.profile.toArray(), []);
  const marks = useLiveQuery(() => db.marks.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];

  const profile: SwimmerProfile = profiles?.[0] ?? {
    ...DEFAULT_SWIMMER_PROFILE,
    id: 1,
  };

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
  ) => {
    if (existingId !== undefined) {
      await db.marks.put({ ...markData, id: existingId });
      setEditingMark(null);
      setActiveTab('history');
    } else {
      await db.marks.add(markData);
    }
  };

  const handleEditMark = (mark: SwimMark) => {
    setEditingMark(mark);
    setSelectedEventId(mark.eventId);
    setSelectedPoolLength(mark.poolLength);
    setActiveTab('register');
  };

  const handleDeleteMark = async (id: number) => {
    await db.marks.delete(id);
  };

  const handleUpdateProfile = async (updated: SwimmerProfile) => {
    if (updated.id !== undefined) {
      await db.profile.put(updated);
    } else {
      await db.profile.clear();
      await db.profile.add(updated);
    }
  };

  const handleSaveGoal = async (goalData: Omit<SwimGoal, 'id'>) => {
    const existing = await db.goals
      .where('[eventId+poolLength]')
      .equals([goalData.eventId, goalData.poolLength])
      .first();

    if (existing && existing.id !== undefined) {
      await db.goals.put({ ...goalData, id: existing.id });
    } else {
      await db.goals.add(goalData);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    await db.goals.delete(id);
  };

  const handleExportJson = async () => {
    const json = await exportDatabaseAsJson();
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(json, `split-backup-${dateStr}.json`, 'application/json;charset=utf-8');
  };

  const handleImportJson = async (file: File) => {
    const text = await file.text();
    return importDatabaseFromJson(text);
  };

  const handleExportCsv = () => {
    const csv = exportMarksAsCsv(marks, profile.gender);
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(csv, `split-marcas-${dateStr}.csv`, 'text/csv;charset=utf-8');
  };

  const handleLoadDemo = async () => {
    return loadDemoDataset();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header profile={profile} onSelectTab={(tab) => handleNavigate(tab)} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-24">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            marks={marks}
            goals={goals}
            onNavigate={handleNavigate}
            onLoadDemo={async () => {
              await handleLoadDemo();
            }}
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
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onSelectTab={(tab) => handleNavigate(tab)} />
    </div>
  );
};

export default App;

