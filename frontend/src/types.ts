export type ShuttleState = 'arrived' | 'on_route';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Route {
  id: string;
  name: string;
  /** The two stop ids this route runs between. Both routes are anchored at CITS. */
  stops: [string, string];
}

export interface GpsSample {
  verified: boolean;
  distanceMeters: number | null;
  accuracy: number | null;
  lat: number | null;
  lon: number | null;
}

export interface ShuttleStatus {
  routeId: string;
  driverId: string;
  /** The stop this shuttle is at (state 'arrived') or departed from (state 'on_route'). */
  currentStop: string;
  state: ShuttleState;
  updatedAt: number;
  /** Only present on 'arrived' check-ins — GPS confirmation of the tap. */
  gps?: GpsSample;
}

export interface CheckInLogEntry {
  state: ShuttleState;
  driverId: string;
  currentStop: string;
  gps?: GpsSample;
}
