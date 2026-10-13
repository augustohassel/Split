import React from 'react';
import { ActiveTab } from '../../types';
import { LayoutDashboard, LineChart, PlusCircle, Target } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'register',
      label: 'Registrar',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: 'Evolución',
      icon: <LineChart className="w-5 h-5" />,
    },
    {
      id: 'goals',
      label: 'Objetivos',
      icon: <Target className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-4 px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="text-[11px] mt-1 leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

