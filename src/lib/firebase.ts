import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');

// State lock to prevent concurrent popup requests that trigger Firebase Auth internal assertion errors
let activeAuthPromise: Promise<{ user: any; accessToken: string } | null> | null = null;

export const googleSignIn = async () => {
  if (activeAuthPromise) {
    console.warn("Sign-in popup is already active, returning existing request.");
    return activeAuthPromise;
  }

  activeAuthPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      return { user: result.user, accessToken: token || '' };
    } catch (err: any) {
      console.warn("Firebase Auth popup notice:", err?.code || err?.message);
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('Pop-up was blocked by browser or iframe policy. Please allow pop-ups or open app in a new tab.');
      }
      if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in request was cancelled or popup closed.');
      }
      if (err?.message?.includes('INTERNAL ASSERTION FAILED')) {
        throw new Error('Auth state resetting. Please try signing in again in a moment.');
      }
      throw new Error(err?.message || 'Authentication failed.');
    } finally {
      activeAuthPromise = null;
    }
  })();

  return activeAuthPromise;
};

export const logout = async () => {
  await signOut(auth);
};
