import { canonicalizeLocalPhone } from './phoneFormat';

const STORAGE_KEY = 'kp_trusted_driver_phones';

function readTrustedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function isTrustedOnThisDevice(phone: string): boolean {
  return readTrustedSet().has(canonicalizeLocalPhone(phone));
}

export function trustOnThisDevice(phone: string): void {
  const trusted = readTrustedSet();
  trusted.add(canonicalizeLocalPhone(phone));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...trusted]));
  } catch {
    // localStorage unavailable (private browsing, quota) -- fail open to
    // "not trusted" rather than blocking sign-in.
  }
}
