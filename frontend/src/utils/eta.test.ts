import { describe, expect, it } from 'vitest';
import { backendDayOfWeek, describeStopStatus, formatEtaMinutes } from './eta';

describe('backendDayOfWeek', () => {
  it('converts JS day-of-week (0=Sun..6=Sat) to backend day-of-week (0=Mon..6=Sun)', () => {
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const jsDay = date.getDay();
      const expected = (jsDay + 6) % 7;
      expect(backendDayOfWeek(date)).toBe(expected);
    }
  });
});

describe('formatEtaMinutes', () => {
  it('shows "Arriving now" for zero or negative minutes', () => {
    expect(formatEtaMinutes(0)).toBe('Arriving now');
    expect(formatEtaMinutes(-1)).toBe('Arriving now');
  });

  it('shows "Less than a minute" for a small positive estimate', () => {
    expect(formatEtaMinutes(0.5)).toBe('Less than a minute');
  });

  it('rounds a positive estimate to the nearest minute', () => {
    expect(formatEtaMinutes(4.6)).toBe('~5 min');
    expect(formatEtaMinutes(4.4)).toBe('~4 min');
  });
});

describe('describeStopStatus', () => {
  it('describes the predicted wait when a prediction is available', () => {
    const result = describeStopStatus({
      stop: 'CITS',
      estimated_wait_minutes: 6,
      confidence: 'synthetic',
    });
    expect(result.headline).toBe('~6 min');
    expect(result.detail).toMatch(/synthetic/i);
  });

  it('labels real-data-informed predictions differently', () => {
    const result = describeStopStatus({
      stop: 'CITS',
      estimated_wait_minutes: 6,
      confidence: 'real_data_informed',
    });
    expect(result.detail).toMatch(/real observations/i);
  });

  it('shows "no estimate" when there is no prediction', () => {
    const result = describeStopStatus(null);
    expect(result.headline).toMatch(/no estimate/i);
  });
});
