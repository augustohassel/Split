import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  isFirebaseConfigured,
  loadFirebaseClient,
} from '../infrastructure/firebase/firebase-client';
import { SwimRepositoryError } from '../db/repositories/swim-repository.interface';
import {
  getLocalSwimRepository,
  getStoreState,
  saveChatMessagesToDb,
  setActiveSwimRepository,
  writeLocalMirror,
} from '../db';
import {
  CloudMigrationResult,
  migrateAndSyncLocalDataToCloud,
} from '../services/cloud-migration.service';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type SyncStatus =
  | 'local-only'
  | 'connecting'
  | 'migrating'
  | 'synced'
  | 'offline-cached'
  | 'error';

export interface AuthContextValue {
  isFirebaseAvailable: boolean;
  user: AuthUser | null;
  loading: boolean;
  syncStatus: SyncStatus;
  authError: string | null;
  lastMigrationResult: CloudMigrationResult | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const defaultAuthContextValue: AuthContextValue = {
  isFirebaseAvailable: false,
  user: null,
  loading: false,
  syncStatus: 'local-only',
  authError: null,
  lastMigrationResult: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  clearAuthError: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

function mapFirebaseUser(u: FirebaseUser): AuthUser {
  return {
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatAuthErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';

  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return 'Inicio de sesión cancelado: cerraste la ventana de Google antes de completar el acceso. Tus datos locales siguen intactos.';
  }

  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente de Google. Habilitá los popups para este sitio e intentá nuevamente.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Sin conexión a internet para iniciar sesión con Google. Podés seguir usando Split en modo offline local.';
  }

  if (code.includes('permission-denied') || code.includes('403')) {
    return 'Acceso denegado a la nube (403). Tus datos siguen disponibles y protegidos en este dispositivo.';
  }

  if (err instanceof Error && err.message) {
    return `No se pudo completar la autenticación: ${err.message}`;
  }

  return 'No se pudo conectar con Google. Tus datos locales siguen seguros en este dispositivo.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirebaseAvailable = useMemo(() => isFirebaseConfigured(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseAvailable);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isFirebaseAvailable ? 'connecting' : 'local-only'
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastMigrationResult, setLastMigrationResult] =
    useState<CloudMigrationResult | null>(null);

  const unsubRepoRef = useRef<(() => void) | null>(null);

  const handleRepositoryError = useCallback((repoError: SwimRepositoryError) => {
    if (repoError.isPermissionDenied) {
      setSyncStatus('error');
      setAuthError(repoError.message);
    } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline-cached');
    } else {
      setSyncStatus('error');
      setAuthError(repoError.message);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseAvailable) {
      setLoading(false);
      setSyncStatus('local-only');
      setActiveSwimRepository(getLocalSwimRepository());
      return;
    }

    let cancelled = false;
    let unsubAuth: (() => void) | null = null;

    void (async () => {
      const [client, { onAuthStateChanged }, { FirestoreSwimRepository }] =
        await Promise.all([
          loadFirebaseClient(),
          import('firebase/auth'),
          import('../db/repositories/firestore-swim-repository'),
        ]);

      if (cancelled) return;

      if (!client.isConfigured || !client.auth || !client.db) {
        setLoading(false);
        setSyncStatus('local-only');
        setActiveSwimRepository(getLocalSwimRepository());
        return;
      }

      const firestoreDb = client.db;

      unsubAuth = onAuthStateChanged(client.auth, async (firebaseUser) => {
        if (unsubRepoRef.current) {
          unsubRepoRef.current();
          unsubRepoRef.current = null;
        }

        if (!firebaseUser) {
          setActiveSwimRepository(getLocalSwimRepository());
          setUser(null);
          setSyncStatus('local-only');
          setLoading(false);
          return;
        }

        const mappedUser = mapFirebaseUser(firebaseUser);
        setUser(mappedUser);
        setLoading(false);
        setAuthError(null);

        const cloudRepo = new FirestoreSwimRepository(
          firestoreDb,
          firebaseUser.uid,
          handleRepositoryError
        );

        setSyncStatus('migrating');
        try {
          const migrationRes = await migrateAndSyncLocalDataToCloud(
            getLocalSwimRepository(),
            cloudRepo
          );
          setLastMigrationResult(migrationRes);
          setActiveSwimRepository(cloudRepo);
          setSyncStatus(
            typeof navigator !== 'undefined' && navigator.onLine === false
              ? 'offline-cached'
              : 'synced'
          );
        } catch (err) {
          const isOffline =
            typeof navigator !== 'undefined' && navigator.onLine === false;
          if (isOffline) {
            setActiveSwimRepository(cloudRepo);
            setSyncStatus('offline-cached');
          } else {
            handleRepositoryError({
              code:
                err && typeof err === 'object' && 'code' in err
                  ? String((err as { code?: unknown }).code)
                  : 'migration-error',
              message: formatAuthErrorMessage(err),
              isPermissionDenied:
                String((err as { code?: unknown })?.code || '').includes(
                  'permission-denied'
                ),
            });
            setActiveSwimRepository(getLocalSwimRepository());
          }
        }

        unsubRepoRef.current = cloudRepo.subscribe({
          onProfileChange: (remoteProfile) => {
            const current = getStoreState();
            writeLocalMirror(remoteProfile, current.marks, current.goals);
            void getLocalSwimRepository().saveProfile(remoteProfile);
          },
          onMarksChange: (remoteMarks) => {
            const current = getStoreState();
            writeLocalMirror(current.profile, remoteMarks, current.goals);
            void getLocalSwimRepository().bulkSaveMarks(remoteMarks);
          },
          onGoalsChange: (remoteGoals) => {
            const current = getStoreState();
            writeLocalMirror(current.profile, current.marks, remoteGoals);
            void getLocalSwimRepository().bulkSaveGoals(remoteGoals);
          },
          onChatMessagesChange: (remoteMessages) => {
            if (remoteMessages.length > 0) {
              void saveChatMessagesToDb(remoteMessages, { skipCloudSync: true });
            }
          },
          onError: handleRepositoryError,
        });
      });
    })();

    return () => {
      cancelled = true;
      if (unsubAuth) {
        unsubAuth();
      }
      if (unsubRepoRef.current) {
        unsubRepoRef.current();
        unsubRepoRef.current = null;
      }
    };
  }, [handleRepositoryError, isFirebaseAvailable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (user) {
        setSyncStatus((prev) => (prev === 'error' ? prev : 'synced'));
      }
    };

    const handleOffline = () => {
      if (user) {
        setSyncStatus('offline-cached');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!isFirebaseAvailable) {
      setAuthError(
        'La sincronización en la nube no está configurada en este entorno (faltan variables VITE_FIREBASE_*). Tus datos siguen operando 100% en modo local.'
      );
      return;
    }

    try {
      setLoading(true);
      const [client, { signInWithPopup }] = await Promise.all([
        loadFirebaseClient(),
        import('firebase/auth'),
      ]);
      if (!client.auth || !client.googleProvider) {
        setAuthError(
          'No se pudo inicializar el proveedor de autenticación de Google en este entorno.'
        );
        return;
      }
      await signInWithPopup(client.auth, client.googleProvider);
    } catch (err) {
      setAuthError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isFirebaseAvailable]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    if (unsubRepoRef.current) {
      unsubRepoRef.current();
      unsubRepoRef.current = null;
    }
    setActiveSwimRepository(getLocalSwimRepository());

    if (isFirebaseAvailable) {
      try {
        const [client, { signOut: firebaseSignOut }] = await Promise.all([
          loadFirebaseClient(),
          import('firebase/auth'),
        ]);
        if (client.auth) {
          await firebaseSignOut(client.auth);
        }
      } catch (err) {
        setAuthError(formatAuthErrorMessage(err));
      }
    }
    setUser(null);
    setSyncStatus('local-only');
  }, [isFirebaseAvailable]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isFirebaseAvailable,
      user,
      loading,
      syncStatus,
      authError,
      lastMigrationResult,
      signInWithGoogle,
      signOutUser,
      clearAuthError,
    }),
    [
      authError,
      clearAuthError,
      isFirebaseAvailable,
      lastMigrationResult,
      loading,
      signInWithGoogle,
      signOutUser,
      syncStatus,
      user,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
