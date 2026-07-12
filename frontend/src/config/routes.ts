import type { Route, Stop } from '../types';

// Approximate coordinates (UNILAG/Akoka area) — good enough to tell the 3
// stops apart for GPS arrival verification since they're km apart, but not
// surveyed. Replace with surveyed points before relying on this for
// anything more precise than "which of these 3 stops am I at".
export const STOPS: Stop[] = [
  { id: 'cits', name: 'CITS', lat: 6.5158, lon: 3.3898 },
  { id: 'bariga', name: 'Bariga', lat: 6.5311, lon: 3.3889 },
  { id: 'yaba', name: 'Yaba', lat: 6.5024, lon: 3.3792 },
];

// Both routes are bidirectional and anchored at CITS, the one on-campus
// terminal. A driver picks one of these for their entire working day.
export const ROUTES: Route[] = [
  { id: 'cits-bariga', name: 'CITS ↔ Bariga', stops: ['cits', 'bariga'] },
  { id: 'cits-yaba', name: 'CITS ↔ Yaba', stops: ['cits', 'yaba'] },
];

export function stopById(stopId: string): Stop | undefined {
  return STOPS.find((s) => s.id === stopId);
}

export function stopName(stopId: string): string {
  return stopById(stopId)?.name ?? stopId;
}

export function routeName(routeId: string): string {
  return ROUTES.find((r) => r.id === routeId)?.name ?? routeId;
}

export function routeById(routeId: string): Route | undefined {
  return ROUTES.find((r) => r.id === routeId);
}

/** Given a route and the stop a driver is currently at/departed from, return the other end. */
export function otherStop(routeId: string, stopId: string): string {
  const route = routeById(routeId);
  if (!route) return stopId;
  const [a, b] = route.stops;
  return stopId === a ? b : a;
}
