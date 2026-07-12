import type { ConnectionState } from '../../hooks/useShuttles';

export function ConnectionBanner({ connection }: { connection: ConnectionState }) {
  if (connection === 'connected') return null;

  const message =
    connection === 'reconnecting'
      ? 'Reconnecting… showing the last known status.'
      : 'Connecting to live shuttle data…';

  return (
    <div className="connection-banner" role="status">
      {message}
    </div>
  );
}
