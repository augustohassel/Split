import React from 'react';
import { ActiveTab } from '../../types';
import { Bot, LayoutDashboard, LineChart, PlusCircle, Target } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  marksCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  marksCount = 0,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'register',
      label: 'Registrar',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <LineChart className="w-5 h-5" />,
      badge: marksCount > 0 ? marksCount : undefined,
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-outline/40 pb-[env(safe-area-inset-bottom,0px)] transition-colors"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-5 px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-primary-md3 bg-primary-md3/15 font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3.5 min-w-[18px] h-[16px] px-1 rounded-full bg-primary-md3 text-on-primary text-[10px] font-extrabold font-mono flex items-center justify-center shadow">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
