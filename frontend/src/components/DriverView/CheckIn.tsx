import { useState, type FormEvent } from 'react';
import { verifyDriver, ApiError, type VerifyDriverResponse } from '../../api/backend';
import { checkIn } from '../../services/shuttleService';
import { ROUTES, routeName, stopName, otherStop } from '../../config/routes';
import type { Route, ShuttleStatus } from '../../types';

type Phase = 'login' | 'verifying' | 'choosing_route' | 'choosing_stop' | 'ready' | 'submitting';

export function CheckIn() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [phase, setPhase] = useState<Phase>('login');
  const [driver, setDriver] = useState<VerifyDriverResponse | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ShuttleStatus | null>(null);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPhase('verifying');
    try {
      const result = await verifyDriver(phone.trim(), pin.trim());
      setDriver(result);
      setPhase('choosing_route');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setPhase('login');
    }
  }

  async function submitCheckIn(stop: string, state: ShuttleStatus['state']) {
    if (!driver || !route) return;
    setError(null);
    setPhase('submitting');
    try {
      const result = await checkIn(route.id, driver.driver_id, stop, state);
      setStatus(result);
      setPhase('ready');
    } catch {
      setError('Could not save check-in. Check your connection and try again.');
      setPhase(status ? 'ready' : 'choosing_stop');
    }
  }

  function handleLogout() {
    setDriver(null);
    setRoute(null);
    setStatus(null);
    setPhase('login');
    setPin('');
  }

  if (!driver || phase === 'login' || phase === 'verifying') {
    return (
      <form className="card check-in-form" onSubmit={handleLogin}>
        <h3>Driver sign-in</h3>
        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="080…"
          required
        />
        <label htmlFor="pin">4-digit PIN</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          required
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={phase === 'verifying'}>
          {phase === 'verifying' ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    );
  }

  if (!route) {
    return (
      <div className="card check-in-form">
        <h3>{driver.name}</h3>
        <p>Which route are you driving today?</p>
        <div className="tap-states">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              className="btn btn-tap"
              onClick={() => setRoute(r)}
            >
              {r.name}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="card check-in-form">
        <h3>{driver.name}</h3>
        <p className="view-subtitle">{routeName(route.id)}</p>
        <p>Where are you starting from today?</p>
        <div className="tap-states">
          {route.stops.map((stopId) => (
            <button
              key={stopId}
              type="button"
              className="btn btn-tap"
              disabled={phase === 'submitting'}
              onClick={() => submitCheckIn(stopId, 'arrived')}
            >
              {stopName(stopId)}
            </button>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    );
  }

  const destination = otherStop(route.id, status.currentStop);
  const nextAction =
    status.state === 'arrived'
      ? { label: `On route to ${stopName(destination)}`, stop: status.currentStop, state: 'on_route' as const }
      : { label: `Arrived at ${stopName(destination)}`, stop: destination, state: 'arrived' as const };

  return (
    <div className="card check-in-form">
      <h3>{driver.name}</h3>
      <p className="view-subtitle">{routeName(route.id)}</p>
      <p className="checkin-current-status" role="status">
        {status.state === 'arrived'
          ? `Arrived at ${stopName(status.currentStop)}`
          : `On route to ${stopName(destination)}`}
      </p>
      <div className="tap-states">
        <button
          type="button"
          className="btn btn-tap btn-tap-active"
          disabled={phase === 'submitting'}
          onClick={() => submitCheckIn(nextAction.stop, nextAction.state)}
        >
          {nextAction.label}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-secondary" onClick={handleLogout}>
        Sign out
      </button>
    </div>
  );
}
