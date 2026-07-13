// Nigeria-only, mirrors backend/services/phone.py's e164_to_local assumption:
// local format is 0XXXXXXXXXX, E.164 is +234XXXXXXXXXX.

export function canonicalizeLocalPhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, '');
}

export function toE164(localPhone: string): string {
  const canonical = canonicalizeLocalPhone(localPhone);
  return '+234' + canonical.replace(/^0/, '');
}
