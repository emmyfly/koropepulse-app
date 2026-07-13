import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL,
);

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;

export const db = app ? getDatabase(app) : null;
export const auth = app ? getAuth(app) : null;

// Anonymous auth is a fallback session layer: it lets the RTDB security
// rules require `auth != null` on writes even if signInAsDriver (below)
// wasn't called or failed. CheckIn.tsx calls signInAsDriver right after a
// successful /drivers/verify(-phone), so by the time this runs
// auth.currentUser is normally already the driver's custom-token session --
// this only actually signs in anonymously if that didn't happen.
export async function ensureSignedIn() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

// Exchanges a backend-minted custom token (see /drivers/verify's
// custom_token field) for a signed-in session scoped to auth.uid ===
// driverId, so RTDB rules can eventually enforce that instead of just
// `auth != null`. Best-effort by design -- callers should swallow errors
// rather than block sign-in on this, since ensureSignedIn's anonymous
// fallback remains the safety net.
export async function signInAsDriver(customToken: string) {
  if (!auth) return null;
  const credential = await signInWithCustomToken(auth, customToken);
  return credential.user;
}
