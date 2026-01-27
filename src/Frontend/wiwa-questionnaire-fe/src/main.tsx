import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { MSG_TYPES, type WiwaInitPayload } from './services/messageService';

const isEmbedded = window.parent !== window;

function Main() {
  const [initData, setInitData] = useState<WiwaInitPayload | null>(null);
  // If not embedded, we don't wait for initData
  const [ready, setReady] = useState(!isEmbedded);

  useEffect(() => {
    if (isEmbedded) {
      console.log('[WiwaEmbedded] Waiting for INIT message...');

      const handleMessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === MSG_TYPES.INIT) {
          console.log('[WiwaEmbedded] Received INIT:', payload);
          setInitData(payload);
          setReady(true);
        }
      };

      window.addEventListener('message', handleMessage);

      // [DEBUG] Timeout to show manual start option if host is unresponsive
      const timer = setTimeout(() => {
        console.warn('[WiwaEmbedded] No INIT received after 2s.');
        const debugEl = document.getElementById('wiwa-debug-overlay');
        if (debugEl) debugEl.style.display = 'flex';
      }, 2000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timer);
      };
    }
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Waiting for host initialization...</p>
        <div id="wiwa-debug-overlay" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
          <p style={{ color: 'orange', fontSize: 12 }}>⚠️ No signal from host.</p>
          <button
            onClick={() => { setInitData({ questionnaireType: 'GREAT_QUEST' }); setReady(true); }}
            style={{ padding: '8px 16px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: 4 }}
          >
            Debug: Force Start (GREAT_QUEST)
          </button>
        </div>
      </div>
    );
  }

  return (
    <App
      embedded={isEmbedded}
      initialType={initData?.questionnaireType}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>,
);
