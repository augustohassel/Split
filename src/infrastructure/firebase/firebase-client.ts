import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth, GoogleAuthProvider } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface FirebaseEnvConfig {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
}

export interface FirebaseClientServices {
  isConfigured: boolean;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  googleProvider: GoogleAuthProvider | null;
}

let cachedClient: FirebaseClientServices | null = null;
let runtimeEnvOverride: FirebaseEnvConfig | null = null;

export function setFirebaseEnvOverrideForTests(override: FirebaseEnvConfig | null): void {
  runtimeEnvOverride = override;
  cachedClient = null;
}

export function getFirebaseOptions(envOverride?: FirebaseEnvConfig): FirebaseOptions | null {
  const source: FirebaseEnvConfig = envOverride ?? runtimeEnvOverride ?? {
    VITE_FIREBASE_API_KEY: import.meta.env?.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: import.meta.env?.VITE_FIREBASE_APP_ID,
  };

  const apiKey = source.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = source.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = source.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = source.VITE_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
  };
}

export function isFirebaseConfigured(envOverride?: FirebaseEnvConfig): boolean {
  return getFirebaseOptions(envOverride) !== null;
}

export function getFirebaseClient(): FirebaseClientServices {
  if (cachedClient) {
    return cachedClient;
  }

  const configured = isFirebaseConfigured();
  if (!configured) {
    return {
      isConfigured: false,
      app: null,
      auth: null,
      db: null,
      googleProvider: null,
    };
  }

  return {
    isConfigured: true,
    app: null,
    auth: null,
    db: null,
    googleProvider: null,
  };
}

export async function loadFirebaseClient(): Promise<FirebaseClientServices> {
  if (cachedClient) {
    return cachedClient;
  }

  const options = getFirebaseOptions();
  if (!options) {
    cachedClient = {
      isConfigured: false,
      app: null,
      auth: null,
      db: null,
      googleProvider: null,
    };
    return cachedClient;
  }

  try {
    const [{ getApp, getApps, initializeApp }, { getAuth, GoogleAuthProvider }, firestoreMod] =
      await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);

    const app = getApps().length > 0 ? getApp() : initializeApp(options);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    let firestoreDb: Firestore;
    try {
      const canUsePersistentCache =
        typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

      firestoreDb = firestoreMod.initializeFirestore(app, {
        localCache: canUsePersistentCache
          ? firestoreMod.persistentLocalCache({
              tabManager: firestoreMod.persistentMultipleTabManager(),
            })
          : firestoreMod.memoryLocalCache(),
      });
    } catch {
      firestoreDb = firestoreMod.getFirestore(app);
    }

    cachedClient = {
      isConfigured: true,
      app,
      auth,
      db: firestoreDb,
      googleProvider,
    };
    return cachedClient;
  } catch {
    cachedClient = {
      isConfigured: false,
      app: null,
      auth: null,
      db: null,
      googleProvider: null,
    };
    return cachedClient;
  }
}
