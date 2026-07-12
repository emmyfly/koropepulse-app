import { useEffect, useState } from 'react';
import { subscribeToShuttles } from '../services/shuttleService';
import type { ShuttleStatus } from '../types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting';

export function useShuttles() {
  const [shuttles, setShuttles] = useState<ShuttleStatus[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const unsubscribe = subscribeToShuttles(
      (data) => {
        setShuttles(data);
        setConnection('connected');
      },
      () => setConnection('reconnecting'),
    );
    return unsubscribe;
  }, []);

  return { shuttles, connection };
}
