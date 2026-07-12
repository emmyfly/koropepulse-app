import { otherStop } from '../config/routes';
import type { ShuttleStatus } from '../types';

export function arrivedAtStop(shuttles: ShuttleStatus[], stopId: string): ShuttleStatus[] {
  return shuttles.filter((s) => s.state === 'arrived' && s.currentStop === stopId);
}

export function inboundToStop(shuttles: ShuttleStatus[], stopId: string): ShuttleStatus[] {
  return shuttles.filter(
    (s) => s.state === 'on_route' && otherStop(s.routeId, s.currentStop) === stopId,
  );
}
