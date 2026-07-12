import { useState } from 'react';
import { useShuttles } from '../../hooks/useShuttles';
import { ConnectionBanner } from '../Layout/ConnectionBanner';
import { ShuttleList } from './ShuttleList';
import { STOPS } from '../../config/routes';

export function CommuterView() {
  const { shuttles, connection } = useShuttles();
  const [stopId, setStopId] = useState(STOPS[0].id);
  const stop = STOPS.find((s) => s.id === stopId) ?? STOPS[0];

  return (
    <section className="view">
      <ConnectionBanner connection={connection} />
      <h2>Live shuttle status</h2>

      <div className="stop-picker" role="tablist" aria-label="Choose your stop">
        {STOPS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === stopId}
            className={`stop-tab${s.id === stopId ? ' stop-tab-active' : ''}`}
            onClick={() => setStopId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <ShuttleList shuttles={shuttles} stopId={stop.id} stopName={stop.name} />
    </section>
  );
}
