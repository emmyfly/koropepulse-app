import { describe, expect, it } from 'vitest';
import { ARRIVAL_RADIUS_METERS, haversineDistanceMeters, verifyArrival } from './geo';

describe('haversineDistanceMeters', () => {
  it('returns 0 for identical points', () => {
    const point = { lat: 6.5158, lon: 3.3898 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it('returns a small nonzero distance for nearby points', () => {
    const a = { lat: 6.5158, lon: 3.3898 };
    const b = { lat: 6.5159, lon: 3.3899 };
    const distance = haversineDistanceMeters(a, b);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(200);
  });

  it('returns a large distance for points far apart', () => {
    const cits = { lat: 6.5158, lon: 3.3898 };
    const abuja = { lat: 9.0765, lon: 7.3986 };
    expect(haversineDistanceMeters(cits, abuja)).toBeGreaterThan(300000);
  });
});

function mockPosition(lat: number, lon: number, accuracy = 15): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lon,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  } as GeolocationPosition;
}

describe('verifyArrival', () => {
  const target = { lat: 6.5158, lon: 3.3898 };

  it('marks arrival unverified when no position is available', () => {
    const result = verifyArrival(null, target);
    expect(result.verified).toBe(false);
    expect(result.distanceMeters).toBeNull();
  });

  it('marks arrival verified when within the radius', () => {
    const result = verifyArrival(mockPosition(target.lat, target.lon), target);
    expect(result.verified).toBe(true);
    expect(result.distanceMeters).toBeLessThanOrEqual(ARRIVAL_RADIUS_METERS);
  });

  it('marks arrival unverified when far outside the radius', () => {
    const result = verifyArrival(mockPosition(target.lat + 1, target.lon + 1), target);
    expect(result.verified).toBe(false);
  });
});
