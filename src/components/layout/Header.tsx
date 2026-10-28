import React from 'react';
import { ActiveTab, SwimmerProfile, ThemeMode } from '../../types';
import { Bot, Moon, Sun, Timer, User } from 'lucide-react';

interface HeaderProps {
  profile?: SwimmerProfile;
  onSelectTab: (tab: ActiveTab) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onSelectTab,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 transition-colors">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-active:scale-95 transition-transform">
            <Timer className="w-5 h-5 text-slate-950 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Split
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
              Marcas, Parciales &amp; Puntos FINA
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-300 transition-colors"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
            title="Abrir Asistente de Chat"
            aria-label="Abrir Asistente de Chat"
          >
            <Bot className="w-4 h-4" />
          </button>

          {profile && (
            <button
              type="button"
              onClick={() => onSelectTab('goals')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 text-xs transition-colors"
              title="Editar Perfil y Objetivos"
            >
              <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <div className="text-right">
                <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
                  {profile.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
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

