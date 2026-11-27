import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any legacy service workers so web deployments never serve stale cached builds.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      })
      .catch(() => {});
  } catch {
    // Ignore restricted iframe environments where serviceWorker access throws
  }
}

createRoot(document.getElementById('root')!).render(<App />);
