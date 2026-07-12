import type { GpsSample } from '../types';

export interface GeoPoint {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Lagos GPS accuracy is often 20-50m in traffic/among buildings, and the 3
// stops are km apart, so a generous radius still unambiguously identifies
// which stop a driver is at.
export const ARRIVAL_RADIUS_METERS = 300;

/**
 * Soft-fail on purpose: a missing/denied/inaccurate GPS reading must never
 * block a driver's tap on a low-end phone. It just gets logged unverified.
 */
export function verifyArrival(position: GeolocationPosition | null, target: GeoPoint): GpsSample {
  if (!position) {
    return { verified: false, distanceMeters: null, accuracy: null, lat: null, lon: null };
  }
  const { latitude, longitude, accuracy } = position.coords;
  const distanceMeters = haversineDistanceMeters({ lat: latitude, lon: longitude }, target);
  return {
    verified: distanceMeters <= ARRIVAL_RADIUS_METERS,
    distanceMeters: Math.round(distanceMeters),
    accuracy: accuracy ?? null,
    lat: latitude,
    lon: longitude,
  };
}

export function getCurrentPosition(timeoutMs = 8000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
