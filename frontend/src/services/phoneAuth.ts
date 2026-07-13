import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import { toE164 } from '../utils/phoneFormat';

export interface OtpChallenge {
  confirm(code: string): Promise<string>;
}

// Confirmed by manual testing: if the Phone provider isn't enabled (or
// reCAPTCHA's network round-trip stalls), signInWithPhoneNumber doesn't
// reject quickly -- it just hangs, which would leave a driver stuck on
// "Sending code..." forever with no escape. Bound it so a hang is always
// treated as a failure (falls back to the PIN path) rather than a wait.
const SEND_OTP_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out sending verification code.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

function getRecaptchaVerifier(): RecaptchaVerifier {
  if (!auth) throw new Error('Firebase is not configured');
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  }
  return recaptchaVerifier;
}

export async function sendOtp(localPhone: string): Promise<OtpChallenge> {
  if (!auth) throw new Error('Firebase is not configured');
  try {
    const confirmationResult = await withTimeout(
      signInWithPhoneNumber(auth, toE164(localPhone), getRecaptchaVerifier()),
      SEND_OTP_TIMEOUT_MS,
    );
    return {
      async confirm(code: string) {
        const credential = await confirmationResult.confirm(code);
        return credential.user.getIdToken();
      },
    };
  } catch (err) {
    // A used/failed verifier is the textbook cause of "reCAPTCHA has already
    // been rendered in this element" on retry -- force a fresh one next time.
    recaptchaVerifier?.clear();
    recaptchaVerifier = null;
    throw err;
  }
}

export function resetRecaptcha(): void {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}
