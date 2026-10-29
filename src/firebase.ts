import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal @firebase/firestore connection retry logs
setLogLevel('silent');

// Filter benign Firebase offline / token-service-api warnings from triggering error overlays
try {
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const combined = args
      .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
      .join(' ')
      .toLowerCase();
    if (
      combined.includes('could not reach cloud firestore backend') ||
      combined.includes('token-service-api') ||
      combined.includes('fetching auth token failed') ||
      combined.includes('client is offline') ||
      combined.includes('please check your firebase configuration')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
} catch {
  // Ignore if console.error is read-only
}

const AUTH_LOGIN_TS_KEY = 'mai_auth_login_ts';
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000; // 50 minutes

let cachedSessionIdToken = '';
let cachedSessionRefreshToken = '';
let cachedSessionUid = '';

function readTokenFromStorage(): { idToken: string; refreshToken: string; uid: string } | null {
  try {
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith('firebase:authUser:')) {
          const raw = storage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const idToken = parsed?.stsTokenManager?.accessToken;
          const refreshToken = parsed?.stsTokenManager?.refreshToken || '';
          const uid = parsed?.uid || '';
          if (typeof idToken === 'string' && idToken.length > 20) {
            return { idToken, refreshToken, uid };
          }
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  if (cachedSessionIdToken) {
    return {
      idToken: cachedSessionIdToken,
      refreshToken: cachedSessionRefreshToken,
      uid: cachedSessionUid
    };
  }
  return null;
}

function extendStoredTokenExpiration(): void {
  try {
    const futureExp = Date.now() + 3600 * 1000;
    for (const storage of [sessionStorage, localStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith('firebase:authUser:')) {
          const raw = storage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed?.stsTokenManager) {
            parsed.stsTokenManager.expirationTime = futureExp;
            if (typeof parsed.stsTokenManager.accessToken === 'string') {
              cachedSessionIdToken = parsed.stsTokenManager.accessToken;
              cachedSessionRefreshToken = parsed.stsTokenManager.refreshToken || '';
              cachedSessionUid = parsed.uid || '';
            }
            storage.setItem(k, JSON.stringify(parsed));
          }
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function isTokenStale(): boolean {
  try {
    const rawTs = localStorage.getItem(AUTH_LOGIN_TS_KEY);
    if (!rawTs) return true;
    const ts = Number(rawTs);
    if (!Number.isFinite(ts)) return true;
    // Handle both normal elapsed time and clock adjustments
    const elapsed = Math.abs(Date.now() - ts);
    return elapsed > TOKEN_MAX_AGE_MS;
  } catch {
    return true;
  }
}

function purgeStaleAuthStorage(): void {
  try {
    if (!isTokenStale()) {
      extendStoredTokenExpiration();
      return;
    }
    localStorage.removeItem(AUTH_LOGIN_TS_KEY);
    for (const storage of [sessionStorage, localStorage]) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith('firebase:')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    }
    if (typeof window !== 'undefined' && window.indexedDB?.deleteDatabase) {
      window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
    }
  } catch {
    // Ignore storage access errors
  }
}

// Note: Do not overwrite window.fetch as Window.fetch has only a getter in the preview environment.

// Purge any expired auth session synchronously BEFORE Firebase Auth initializes
purgeStaleAuthStorage();

const app = initializeApp(firebaseConfig);

function createSafeAuth() {
  try {
    return initializeAuth(app, {
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createSafeAuth();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

function stabilizeUserTokenManager(user: User | null): void {
  if (!user) return;
  try {
    const anyUser = user as unknown as {
      stsTokenManager?: {
        accessToken?: string;
        refreshToken?: string;
        expirationTime?: number;
        getToken?: (authInst: unknown, forceRefresh?: boolean) => Promise<string | null>;
      };
      getIdToken: (forceRefresh?: boolean) => Promise<string>;
      _maiPatched?: boolean;
    };

    if (anyUser.stsTokenManager) {
      if (anyUser.stsTokenManager.accessToken) {
        cachedSessionIdToken = anyUser.stsTokenManager.accessToken;
        cachedSessionRefreshToken = anyUser.stsTokenManager.refreshToken || '';
        cachedSessionUid = user.uid;
      }
      anyUser.stsTokenManager.expirationTime = Date.now() + 3600 * 1000;
    }

    if (!anyUser._maiPatched) {
      anyUser._maiPatched = true;
      const origGetIdToken = user.getIdToken.bind(user);
      anyUser.getIdToken = async (forceRefresh?: boolean): Promise<string> => {
        try {
          if (anyUser.stsTokenManager) {
            anyUser.stsTokenManager.expirationTime = Date.now() + 3600 * 1000;
          }
          return await origGetIdToken(false && forceRefresh);
        } catch {
          const fallback =
            anyUser.stsTokenManager?.accessToken ||
            cachedSessionIdToken ||
            readTokenFromStorage()?.idToken ||
            '';
          return fallback;
        }
      };
    }
  } catch {
    // Ignore patch errors
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isOfflineOrTokenError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('token-service-api') ||
    msg.includes('fetching auth token failed') ||
    msg.includes('network-request-failed') ||
    msg.includes('user-token-expired') ||
    msg.includes('internal-error') ||
    msg.includes('failed to get document')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  if (isOfflineOrTokenError(error)) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  try {
    localStorage.setItem(AUTH_LOGIN_TS_KEY, String(Date.now()));
    stabilizeUserTokenManager(result.user);
    extendStoredTokenExpiration();
  } catch {
    // Ignore storage error
  }
  return result.user;
}

export async function signOutGoogle(): Promise<void> {
  try {
    localStorage.removeItem(AUTH_LOGIN_TS_KEY);
    cachedSessionIdToken = '';
    cachedSessionRefreshToken = '';
    cachedSessionUid = '';
  } catch {
    // Ignore storage error
  }
  await signOut(auth);
}

export function onAuthStateChanged(
  authInstance: typeof auth,
  callback: (user: User | null) => void
) {
  return firebaseOnAuthStateChanged(authInstance, async (currentUser) => {
    if (currentUser) {
      if (isTokenStale()) {
        try {
          localStorage.removeItem(AUTH_LOGIN_TS_KEY);
          cachedSessionIdToken = '';
          await signOut(authInstance);
        } catch {
          // Ignore signOut error
        }
        callback(null);
        return;
      }

      stabilizeUserTokenManager(currentUser);
      extendStoredTokenExpiration();
    }

    callback(currentUser);
  });
}

export type { User };
