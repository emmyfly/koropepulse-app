import { beforeEach, describe, expect, it } from 'vitest';
import { isTrustedOnThisDevice, trustOnThisDevice } from './deviceTrust';

describe('deviceTrust', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is not trusted by default', () => {
    expect(isTrustedOnThisDevice('08031234567')).toBe(false);
  });

  it('is trusted after trustOnThisDevice is called', () => {
    trustOnThisDevice('08031234567');
    expect(isTrustedOnThisDevice('08031234567')).toBe(true);
  });

  it('matches across differently-formatted input for the same number', () => {
    trustOnThisDevice('0803 123-4567');
    expect(isTrustedOnThisDevice('08031234567')).toBe(true);
  });

  it('does not trust an unrelated phone number', () => {
    trustOnThisDevice('08031234567');
    expect(isTrustedOnThisDevice('08059876543')).toBe(false);
  });

  it('persists multiple trusted phones independently', () => {
    trustOnThisDevice('08031234567');
    trustOnThisDevice('08059876543');
    expect(isTrustedOnThisDevice('08031234567')).toBe(true);
    expect(isTrustedOnThisDevice('08059876543')).toBe(true);
  });
});
