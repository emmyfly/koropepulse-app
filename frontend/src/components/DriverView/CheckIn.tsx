import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, verifyDriver, verifyDriverPhone, type VerifyDriverResponse } from '../../api/backend';
import { checkIn, checkOut } from '../../services/shuttleService';
import { ROUTES, routeName, stopName, otherStop } from '../../config/routes';
import type { Route, ShuttleStatus } from '../../types';
import { signInAsDriver } from '../../firebase';
import { resetRecaptcha, sendOtp, type OtpChallenge } from '../../services/phoneAuth';
import { isTrustedOnThisDevice, trustOnThisDevice } from '../../utils/deviceTrust';
import { PHONE_AUTH_ENABLED } from '../../config/featureFlags';

type Phase =
  | 'login'
  | 'verifying'
  | 'sending_otp'
  | 'otp_entry'
  | 'verifying_otp'
  | 'choosing_route'
  | 'choosing_stop'
  | 'ready'
  | 'submitting';

export function CheckIn() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [phase, setPhase] = useState<Phase>('login');
  const [driver, setDriver] = useState<VerifyDriverResponse | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ShuttleStatus | null>(null);

  useEffect(() => {
    return () => resetRecaptcha();
  }, []);

  function onVerified(result: VerifyDriverResponse) {
    setDriver(result);
    if (result.custom_token) {
      signInAsDriver(result.custom_token).catch(() => {});
    }
    setPhase('choosing_route');
  }

  async function signInWithPin() {
    setPhase('verifying');
    try {
      const result = await verifyDriver(phone.trim(), pin.trim());
      onVerified(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setPhase('login');
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!PHONE_AUTH_ENABLED || isTrustedOnThisDevice(phone)) {
      await signInWithPin();
      return;
    }

    setPhase('sending_otp');
    try {
      const challenge = await sendOtp(phone.trim());
      setOtpChallenge(challenge);
      setOtpCode('');
      setPhase('otp_entry');
    } catch {
      // OTP send failed for any reason (not configured, network, provider
      // disabled) -- fall back to the PIN they already typed rather than
      // blocking sign-in on infrastructure that isn't ready yet.
      await signInWithPin();
    }
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    if (!otpChallenge) return;
    setError(null);
    setPhase('verifying_otp');
    try {
      const idToken = await otpChallenge.confirm(otpCode.trim());
      const result = await verifyDriverPhone(idToken);
      trustOnThisDevice(phone);
      onVerified(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        // Backend/console genuinely not configured -- retrying can never
        // succeed, so drop straight back to the PIN form.
        setOtpChallenge(null);
        setPhase('login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Incorrect code. Try again.');
      setPhase('otp_entry');
    }
  }

  function switchToPin() {
    setOtpChallenge(null);
    setOtpCode('');
    setError(null);
    setPhase('login');
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
    if (driver && route && status) {
      // Best-effort: end-of-day sign-out should clear the driver's live
      // "arrived" status immediately so it stops showing on the commuter
      // view, but a failed cleanup shouldn't block signing out. Only
      // needed if they actually checked in — nothing to clear otherwise.
      checkOut(route.id, driver.driver_id).catch(() => {});
    }
    setDriver(null);
    setRoute(null);
    setStatus(null);
    setPhase('login');
    setPin('');
    setOtpChallenge(null);
    setOtpCode('');
  }

  function renderPhase() {
    if (!driver) {
      if (phase === 'otp_entry' || phase === 'verifying_otp') {
        return (
          <form className="card check-in-form" onSubmit={handleOtpSubmit}>
            <h3>Enter the code we sent</h3>
            <p className="view-subtitle">Text message sent to {phone}</p>
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="••••••"
              required
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={phase === 'verifying_otp'}>
              {phase === 'verifying_otp' ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={switchToPin}>
              Use PIN instead
            </button>
          </form>
        );
      }

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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={phase === 'verifying' || phase === 'sending_otp'}
          >
            {phase === 'sending_otp' ? 'Sending code…' : phase === 'verifying' ? 'Verifying…' : 'Sign in'}
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
              <button key={r.id} type="button" className="btn btn-tap" onClick={() => setRoute(r)}>
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

  return (
    <>
      <div
        id="recaptcha-container"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      />
      {renderPhase()}
    </>
  );
}
