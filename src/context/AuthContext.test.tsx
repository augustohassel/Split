import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, formatAuthErrorMessage, useAuth } from './AuthContext';
import { setFirebaseEnvOverrideForTests } from '../infrastructure/firebase/firebase-client';
import { getAiSettings, saveAiSettings } from '../services/aiSettings';

const AuthConsumerProbe = () => {
  const { isFirebaseAvailable, syncStatus, user } = useAuth();
  return (
    <div>
      <span data-testid="fb-available">{String(isFirebaseAvailable)}</span>
      <span data-testid="sync-status">{syncStatus}</span>
      <span data-testid="user-state">{user ? user.uid : 'anonymous'}</span>
    </div>
  );
};

describe('AuthContext & Casos de Borde de Autenticación y Privacidad BYOK', () => {
  it('opera en modo local-only cuando no existen variables VITE_FIREBASE_* configuradas', () => {
    setFirebaseEnvOverrideForTests({
      VITE_FIREBASE_API_KEY: '',
      VITE_FIREBASE_AUTH_DOMAIN: '',
      VITE_FIREBASE_PROJECT_ID: '',
      VITE_FIREBASE_APP_ID: '',
    });

    render(
      <AuthProvider>
        <AuthConsumerProbe />
      </AuthProvider>
    );

    expect(screen.getByTestId('fb-available')).toHaveTextContent('false');
    expect(screen.getByTestId('sync-status')).toHaveTextContent('local-only');
    expect(screen.getByTestId('user-state')).toHaveTextContent('anonymous');
  });

  it('formatea el Caso de falla 1: cancelación de popup (auth/popup-closed-by-user) y bloqueo (auth/popup-blocked)', () => {
    const closedMsg = formatAuthErrorMessage({ code: 'auth/popup-closed-by-user' });
    expect(closedMsg).toMatch(/inicio de sesión cancelado/i);
    expect(closedMsg).toMatch(/datos locales siguen intactos/i);

    const blockedMsg = formatAuthErrorMessage({ code: 'auth/popup-blocked' });
    expect(blockedMsg).toMatch(/bloqueó la ventana emergente/i);
  });

  it('formatea el Caso de falla 3: error de permisos 403 (permission-denied) preservando disponibilidad local', () => {
    const deniedMsg = formatAuthErrorMessage({ code: 'firestore/permission-denied' });
    expect(deniedMsg).toMatch(/acceso denegado a la nube \(403\)/i);
    expect(deniedMsg).toMatch(/disponibles y protegidos en este dispositivo/i);
  });

  it('mantiene la Gemini API Key (BYOK) estrictamente en localStorage aislado de la base de datos', () => {
    localStorage.clear();
    saveAiSettings({
      provider: 'gemini',
      apiKey: 'AIzaSyTestLocalKeyOnly',
      modelName: 'gemini-1.5-flash',
    });

    const stored = getAiSettings();
    expect(stored.apiKey).toBe('AIzaSyTestLocalKeyOnly');
    expect(localStorage.getItem('split_db_mirror_v1')).toBeNull();
  });
});
