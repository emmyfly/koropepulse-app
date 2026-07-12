import { onValue, ref, serverTimestamp, set } from 'firebase/database';
import { db, ensureSignedIn } from '../firebase';
import { stopById } from '../config/routes';
import { getCurrentPosition, verifyArrival } from '../utils/geo';
import type { GpsSample, ShuttleState, ShuttleStatus } from '../types';

type RawShuttleSnapshot = Record<string, Record<string, ShuttleStatus>>;

export function subscribeToShuttles(
  onUpdate: (shuttles: ShuttleStatus[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error('Firebase is not configured'));
    return () => {};
  }
  const shuttlesRef = ref(db, 'shuttles');
  const unsubscribe = onValue(
    shuttlesRef,
    (snapshot) => {
      const raw = (snapshot.val() ?? {}) as RawShuttleSnapshot;
      const flattened = Object.values(raw).flatMap((byDriver) => Object.values(byDriver ?? {}));
      onUpdate(flattened);
    },
    (error) => onError?.(error as unknown as Error),
  );
  return unsubscribe;
}

export async function checkIn(
  routeId: string,
  driverId: string,
  stop: string,
  state: ShuttleState,
): Promise<ShuttleStatus> {
  if (!db) throw new Error('Firebase is not configured');
  await ensureSignedIn();

  let gps: GpsSample | undefined;
  if (state === 'arrived') {
    const target = stopById(stop);
    if (target) {
      const position = await getCurrentPosition();
      gps = verifyArrival(position, target);
    }
  }

  const status: ShuttleStatus = {
    routeId,
    driverId,
    currentStop: stop,
    state,
    updatedAt: Date.now(),
    ...(gps ? { gps } : {}),
  };
  await set(ref(db, `shuttles/${routeId}/${driverId}`), status);

  const logId = `${Date.now()}_${driverId}`;
  await set(ref(db, `checkinLogs/${routeId}/${logId}`), {
    state,
    driverId,
    currentStop: stop,
    ...(gps ? { gps } : {}),
    loggedAt: serverTimestamp(),
  });

  return status;
}
