import { useState } from 'react';
import { CommuterView } from './components/CommuterView/CommuterView';
import { DriverView } from './components/DriverView/DriverView';
import { firebaseConfigured } from './firebase';
import './App.css';

type Tab = 'commuter' | 'driver';

function App() {
  const [tab, setTab] = useState<Tab>('commuter');

  return (
    <>
      <header className="app-header">
        <h1>KoropePulse</h1>
        <p className="app-tagline">Live UNILAG shuttle status</p>
      </header>

      {!firebaseConfigured && (
        <p className="config-warning" role="alert">
          Firebase isn't configured yet. Add your project keys to .env.local.
        </p>
      )}

      <div className="mode-switch">
        {tab === 'commuter' ? (
          <button type="button" className="mode-switch-link" onClick={() => setTab('driver')}>
            Driver sign-in →
          </button>
        ) : (
          <button type="button" className="mode-switch-link" onClick={() => setTab('commuter')}>
            ← Back to live status
          </button>
        )}
      </div>

      <main>{tab === 'commuter' ? <CommuterView /> : <DriverView />}</main>
    </>
  );
}

export default App;
