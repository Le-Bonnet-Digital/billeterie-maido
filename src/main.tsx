import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Optionally silence noisy dev warnings from vendor libs
if (import.meta.env.DEV && import.meta.env.VITE_SILENCE_VENDOR_WARNINGS === 'true') {
  import('./lib/consoleFilters').then((m) => m.installConsoleFilters());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
