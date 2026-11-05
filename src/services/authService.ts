import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fbSignOut,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  type User,
} from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type AuthStateStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'RESTORED';

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  isDomainError: boolean;
  currentDomain: string;
  projectId: string;
  consoleSettingsUrl: string;
  recommendedDomains: string[];
}

// Track ongoing login request to prevent duplicate concurrent popups
let isLoginInProgress = false;

/**
 * Gets the current domain/hostname where the app is running.
 */
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname;
  }
  return '';
}

/**
 * Returns the complete list of known domains for MINES AI that need
 * to be authorized in Firebase Console (Authentication > Settings > Authorized domains).
 */
export function getRequiredDomainsList(): string[] {
  const current = getCurrentDomain();
  const baseList = [
    'ais-dev-4u5snw7r3zbac5umvwwbq7-328869445945.us-east1.run.app',
    'ais-pre-4u5snw7r3zbac5umvwwbq7-328869445945.us-east1.run.app',
    'localhost',
    '127.0.0.1',
    'gen-lang-client-0218950511.firebaseapp.com',
    'gen-lang-client-0218950511.web.app',
  ];

  if (current && !baseList.includes(current)) {
    baseList.unshift(current);
  }
  return baseList;
}

/**
 * Parses and formats any Firebase Authentication error into actionable diagnostics.
 */
export function parseAuthError(error: unknown): AuthErrorInfo {
  const fbErr = error as { code?: string; message?: string };
  const code = fbErr?.code || 'auth/unknown';
  const currentDomain = getCurrentDomain();
  const projectId = 'gen-lang-client-0218950511';
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const isDomainError = code === 'auth/unauthorized-domain';

  let title = 'Error de autenticación';
  let message = fbErr?.message || 'Ocurrió un error inesperado al conectar con Google.';

  switch (code) {
    case 'auth/unauthorized-domain':
      title = 'Dominio No Autorizado en Firebase Console';
      message = `El dominio actual (${currentDomain || 'este dominio'}) no está agregado en la lista de dominios autorizados del proyecto Firebase "${projectId}".`;
      break;
    case 'auth/popup-blocked':
      title = 'Ventana emergente bloqueada';
      message =
        'El navegador bloqueó la ventana emergente para elegir tu cuenta de Google. Habilita los popups en la barra de direcciones o utiliza la opción de inicio con redirección.';
      break;
    case 'auth/popup-closed-by-user':
      title = 'Inicio cancelado';
      message = 'La ventana de selección de cuenta de Google se cerró antes de completar la autenticación.';
      break;
    case 'auth/cancelled-popup-request':
      title = 'Petición en curso cancelada';
      message = 'Se canceló la solicitud porque ya existía un proceso de inicio de sesión activo.';
      break;
    case 'auth/network-request-failed':
      title = 'Fallo de conexión';
      message = 'No se pudo contactar a los servidores de Google Identity. Verifica tu conexión a internet.';
      break;
    case 'auth/account-exists-with-different-credential':
      title = 'Cuenta duplicada con otro proveedor';
      message = 'Ya existe una cuenta registrada con este correo electrónico mediante otro método de acceso.';
      break;
    case 'auth/operation-not-allowed':
      title = 'Proveedor Google no habilitado';
      message = `El proveedor Google Sign-In no está habilitado en Firebase Console para el proyecto ${projectId}.`;
      break;
  }

  return {
    code,
    title,
    message,
    isDomainError,
    currentDomain,
    projectId,
    consoleSettingsUrl,
    recommendedDomains: getRequiredDomainsList(),
  };
}

/**
 * Synchronizes user profile to Firestore (users/{uid}) strictly adhering
 * to the firebase-blueprint.json schema and firestore.rules validation.
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || user.isAnonymous) return;

  const now = new Date().toISOString();
  const userRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      // New user registration
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || 'usuario@win10k.pro',
        createdAt: now,
      });
      console.log('Nuevo usuario registrado en Cloud Firestore:', user.uid);
    }
  } catch (err) {
    // If rules or offline, log warning without breaking authentication session
    console.warn('Aviso sincronizando perfil de usuario en Firestore:', err);
  }
}

/**
 * Initiates real Google Sign-In with popup, falling back to redirect if popup is blocked.
 * Prevents duplicate requests.
 */
export async function loginWithGoogle(options?: { preferRedirect?: boolean }): Promise<User> {
  if (isLoginInProgress) {
    throw {
      code: 'auth/cancelled-popup-request',
      message: 'Ya hay una solicitud de inicio de sesión en progreso. Por favor espera un momento.',
    };
  }

  isLoginInProgress = true;

  try {
    // Enforce browser local persistence
    await setPersistence(auth, browserLocalPersistence).catch(() => {});

    // Always ask user to select account (prevents auto-selecting stuck accounts)
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });

    if (options?.preferRedirect) {
      await signInWithRedirect(auth, googleProvider);
      // signInWithRedirect navigates away, but in case it doesn't immediately:
      throw new Error('Redirigiendo a Google...');
    }

    // Standard popup flow
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, googleProvider);
    } catch (popupErr: unknown) {
      const fbErr = popupErr as { code?: string };
      // Fallback to redirect if popup was blocked by browser
      if (fbErr?.code === 'auth/popup-blocked') {
        console.info('Popup bloqueado, intentando signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        throw popupErr;
      }
      throw popupErr;
    }

    const user = userCredential.user;
    await syncUserProfile(user);
    return user;
  } finally {
    isLoginInProgress = false;
  }
}

/**
 * Checks for a redirect result upon application boot (when signInWithRedirect was used).
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (err) {
    console.warn('Aviso verificando resultado de redirección:', err);
    return null;
  }
}

/**
 * Signs out the current user and clears session.
 */
export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Signs in anonymously as guest.
 */
export async function loginAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}
