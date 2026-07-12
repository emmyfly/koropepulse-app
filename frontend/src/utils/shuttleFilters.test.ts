import { describe, expect, it } from 'vitest';
import { arrivedAtStop, inboundToStop } from './shuttleFilters';
import type { ShuttleStatus } from '../types';

function shuttle(overrides: Partial<ShuttleStatus>): ShuttleStatus {
  return {
    routeId: 'cits-bariga',
    driverId: 'driver-001',
    currentStop: 'cits',
    state: 'arrived',
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('arrivedAtStop', () => {
  it('includes shuttles arrived at the given stop', () => {
    const shuttles = [shuttle({ currentStop: 'cits', state: 'arrived' })];
    expect(arrivedAtStop(shuttles, 'cits')).toHaveLength(1);
  });

  it('excludes shuttles arrived at a different stop', () => {
    const shuttles = [shuttle({ currentStop: 'bariga', state: 'arrived' })];
    expect(arrivedAtStop(shuttles, 'cits')).toHaveLength(0);
  });

  it('excludes shuttles that are on route', () => {
    const shuttles = [shuttle({ currentStop: 'cits', state: 'on_route' })];
    expect(arrivedAtStop(shuttles, 'cits')).toHaveLength(0);
  });
});

describe('inboundToStop', () => {
  it('includes shuttles on route toward the given stop', () => {
    const shuttles = [shuttle({ routeId: 'cits-bariga', currentStop: 'cits', state: 'on_route' })];
    expect(inboundToStop(shuttles, 'bariga')).toHaveLength(1);
  });

  it('excludes shuttles heading the other direction', () => {
    const shuttles = [shuttle({ routeId: 'cits-bariga', currentStop: 'bariga', state: 'on_route' })];
    expect(inboundToStop(shuttles, 'bariga')).toHaveLength(0);
  });

  it('excludes shuttles that have already arrived', () => {
    const shuttles = [shuttle({ routeId: 'cits-bariga', currentStop: 'cits', state: 'arrived' })];
    expect(inboundToStop(shuttles, 'bariga')).toHaveLength(0);
  });

  it('resolves inbound stops independently per route', () => {
    const shuttles = [
      shuttle({ routeId: 'cits-bariga', currentStop: 'cits', state: 'on_route' }),
      shuttle({ routeId: 'cits-yaba', currentStop: 'cits', state: 'on_route', driverId: 'driver-002' }),
    ];
    expect(inboundToStop(shuttles, 'bariga')).toHaveLength(1);
    expect(inboundToStop(shuttles, 'yaba')).toHaveLength(1);
  });
});
