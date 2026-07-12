import { routeName } from '../../config/routes';
import { arrivedAtStop, inboundToStop } from '../../utils/shuttleFilters';
import type { ShuttleStatus } from '../../types';
import { ETADisplay } from './ETADisplay';

interface ShuttleListProps {
  shuttles: ShuttleStatus[];
  stopId: string;
  stopName: string;
}

export function ShuttleList({ shuttles, stopId, stopName }: ShuttleListProps) {
  const arrived = arrivedAtStop(shuttles, stopId);
  const inbound = inboundToStop(shuttles, stopId);

  return (
    <div className="shuttle-list">
      {arrived.length > 0 && (
        <ul className="shuttle-group">
          {arrived.map((s) => (
            <li key={`${s.routeId}-${s.driverId}`} className="shuttle-card shuttle-card-arrived">
              <span className="shuttle-card-headline">Board now</span>
              <span className="shuttle-card-route">{routeName(s.routeId)}</span>
            </li>
          ))}
        </ul>
      )}

      {arrived.length === 0 && <ETADisplay stopName={stopName} />}

      {inbound.length > 0 && (
        <ul className="shuttle-group">
          {inbound.map((s) => (
            <li key={`${s.routeId}-${s.driverId}`} className="card shuttle-card shuttle-card-inbound">
              <span className="shuttle-state-tag">On the way</span>
              <span>{routeName(s.routeId)}</span>
            </li>
          ))}
        </ul>
      )}

      {arrived.length === 0 && inbound.length === 0 && (
        <p className="shuttle-empty">No buses here yet.</p>
      )}
    </div>
  );
}
