import type { EtaResponse } from '../api/backend';

/** Backend day-of-week is 0=Monday..6=Sunday; JS Date.getDay() is 0=Sunday..6=Saturday. */
export function backendDayOfWeek(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

export function formatEtaMinutes(minutes: number): string {
  if (minutes <= 0) return 'Arriving now';
  if (minutes < 1) return 'Less than a minute';
  return `~${Math.round(minutes)} min`;
}

export interface StopStatusSummary {
  headline: string;
  detail: string | null;
}

/**
 * Only called when nothing has actually arrived yet — a live "arrived"
 * check-in is ground truth and is shown by the shuttle list itself, not
 * duplicated here as a second headline saying the same thing.
 */
export function describeStopStatus(prediction: EtaResponse | null): StopStatusSummary {
  if (prediction) {
    return {
      headline: formatEtaMinutes(prediction.estimated_wait_minutes),
      detail:
        prediction.confidence === 'real_data_informed'
          ? 'Based on real observations'
          : 'Estimated (synthetic baseline)',
    };
  }

  return { headline: 'No estimate available', detail: null };
}
