import React from 'react';
import { ActiveTab, SwimmerProfile, ThemeMode } from '../../types';
import {
  Bot,
  LayoutDashboard,
  LineChart,
  Moon,
  PlusCircle,
  Sun,
  Target,
  Timer,
  User,
} from 'lucide-react';

interface HeaderProps {
  profile?: SwimmerProfile;
  activeTab?: ActiveTab;
  marksCount?: number;
  onSelectTab: (tab: ActiveTab) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  marksCount = 0,
  onSelectTab,
  theme = 'light',
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'register',
      label: 'Registrar',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <LineChart className="w-4 h-4" />,
      badge: marksCount > 0 ? marksCount : undefined,
    },
    {
      id: 'goals',
      label: 'Objetivos',
      icon: <Target className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-outline/40 px-4 md:px-6 py-2.5 md:py-3 transition-colors">
      <div className="max-w-3xl md:max-w-6xl lg:max-w-7xl mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-active:scale-95 transition-transform">
            <Timer className="w-5 h-5 text-slate-950 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-on-surface">
                Split
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-md3/15 text-primary-md3 border border-primary-md3/30">
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'}
              </span>
            </div>
            <p className="hidden lg:block text-[11px] text-on-surface-variant leading-none">
              Marcas, Parciales &amp; Puntos FINA
            </p>
          </div>
        </button>

        {/* Navegación central para pantallas de escritorio (>= 768px) */}
        <nav
          aria-label="Navegación superior"
          className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-surface-container/60 p-1 rounded-2xl border border-outline/30"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-xl text-[11px] lg:text-xs font-semibold transition-all ${
                  isActive
                    ? 'text-primary-md3 bg-primary-md3/15 shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="min-w-[18px] h-[16px] px-1 rounded-full bg-primary-md3 text-on-primary text-[10px] font-extrabold font-mono flex items-center justify-center shadow">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/50 text-status-amber transition-colors"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Botón individual de Chat solo visible en pantallas móviles (< 768px) */}
          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            className="md:hidden p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/50 text-primary-md3 hover:text-primary-md3/80 transition-colors"
            title="Abrir Asistente de Chat"
            aria-label="Abrir Asistente de Chat"
          >
            <Bot className="w-4 h-4" />
          </button>

          {profile && (
            <button
              type="button"
              onClick={() => onSelectTab('goals')}
              className="flex items-center gap-2 px-2.5 lg:px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/50 text-xs transition-colors"
              title="Editar Perfil y Objetivos"
            >
              <User className="w-3.5 h-3.5 text-primary-md3" />
              <div className="text-right">
                <div className="font-semibold text-on-surface leading-tight max-w-[72px] lg:max-w-[120px] truncate">
                  {profile.name}
                </div>
                <div className="hidden lg:block text-[10px] text-on-surface-variant leading-tight">
                  {profile.gender === 'male' ? 'Hombre' : 'Mujer'} · {profile.defaultPoolLength}m
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
