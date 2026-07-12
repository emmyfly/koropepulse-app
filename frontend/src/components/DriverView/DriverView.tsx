import { CheckIn } from './CheckIn';

export function DriverView() {
  return (
    <section className="view">
      <h2>Driver check-in</h2>
      <p className="view-subtitle">Sign in, then tap your status as you go.</p>
      <CheckIn />
    </section>
  );
}
