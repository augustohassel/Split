import React from 'react';
import { ActiveTab, SwimmerProfile, ThemeMode } from '../../types';
import { AuthUser, SyncStatus, useAuth } from '../../context/AuthContext';
import {
  Bot,
  Cloud,
  CloudOff,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
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
  authUser?: AuthUser | null;
  syncStatus?: SyncStatus;
  isFirebaseAvailable?: boolean;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeTab,
  marksCount = 0,
  onSelectTab,
  theme = 'light',
  onToggleTheme,
  authUser,
  syncStatus,
  isFirebaseAvailable,
  onSignInGoogle,
  onSignOutGoogle,
}) => {
  const auth = useAuth();
  const resolvedUser = authUser !== undefined ? authUser : auth.user;
  const resolvedSyncStatus = syncStatus ?? auth.syncStatus;
  const resolvedFirebaseAvailable =
    isFirebaseAvailable !== undefined ? isFirebaseAvailable : auth.isFirebaseAvailable;
  const handleSignIn = onSignInGoogle ?? (() => void auth.signInWithGoogle());
  const handleSignOut = onSignOutGoogle ?? (() => void auth.signOutUser());

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

  const renderSyncBadge = () => {
    if (resolvedSyncStatus === 'migrating' || resolvedSyncStatus === 'connecting') {
      return (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-md3/15 text-primary-md3 border border-primary-md3/30 text-[10px] font-bold"
          title="Sincronizando datos con Cloud Firestore"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="hidden xl:inline">Sincronizando</span>
        </span>
      );
    }

    if (resolvedSyncStatus === 'offline-cached') {
      return (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-status-amber/15 text-status-amber border border-status-amber/30 text-[10px] font-bold"
          title="Sin conexión: los cambios se guardan en caché local y se sincronizarán al reconectar"
        >
          <CloudOff className="w-3 h-3" />
          <span className="hidden xl:inline">Offline</span>
        </span>
      );
    }

    if (resolvedSyncStatus === 'error') {
      return (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-status-rose/15 text-status-rose border border-status-rose/30 text-[10px] font-bold"
          title="Alerta de permisos o sincronización en la nube"
        >
          <CloudOff className="w-3 h-3" />
          <span className="hidden xl:inline">Alerta Cloud</span>
        </span>
      );
    }

    return (
      <span
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-status-emerald/15 text-status-emerald border border-status-emerald/30 text-[10px] font-bold"
        title={`Sincronizado en la nube (${resolvedUser?.email || resolvedUser?.displayName || 'Google'})`}
      >
        <Cloud className="w-3 h-3" />
        <span className="hidden xl:inline">Cloud</span>
      </span>
    );
  };

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
          {resolvedUser ? (
            <div className="flex items-center gap-1.5">
              {renderSyncBadge()}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/50 text-on-surface-variant hover:text-status-rose text-xs font-semibold transition-colors"
                title="Cerrar sesión de Google"
                aria-label="Cerrar sesión de Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Salir</span>
              </button>
            </div>
          ) : (
            (resolvedFirebaseAvailable || Boolean(onSignInGoogle)) && (
              <button
                type="button"
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary-md3/15 hover:bg-primary-md3/25 border border-primary-md3/30 text-primary-md3 text-xs font-bold transition-colors"
                title="Conectar Google para sincronizar en la nube"
                aria-label="Conectar Google"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Conectar Google</span>
              </button>
            )
          )}

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
