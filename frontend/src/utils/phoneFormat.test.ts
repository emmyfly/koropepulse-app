import { describe, expect, it } from 'vitest';
import { canonicalizeLocalPhone, toE164 } from './phoneFormat';

describe('canonicalizeLocalPhone', () => {
  it('trims whitespace', () => {
    expect(canonicalizeLocalPhone('  08031234567  ')).toBe('08031234567');
  });

  it('strips internal spaces and dashes', () => {
    expect(canonicalizeLocalPhone('0803 123-4567')).toBe('08031234567');
  });
});

describe('toE164', () => {
  it('converts a local number to E.164', () => {
    expect(toE164('08031234567')).toBe('+2348031234567');
  });

  it('canonicalizes before converting', () => {
    expect(toE164(' 0803 123-4567 ')).toBe('+2348031234567');
  });
});
