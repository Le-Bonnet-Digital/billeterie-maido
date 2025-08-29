/* eslint-disable no-console -- This module intentionally wraps console methods to filter noisy dev logs */
/**
 * Install console filters to silence noisy third‑party dev warnings.
 * Only call this in development.
 */
export function installConsoleFilters(): void {
  const info = console.info.bind(console);
  const warn = console.warn.bind(console);

  console.info = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // React devtools suggestion
    if (msg.includes('Download the React DevTools')) return;
    info(...args);
  };

  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // React Router future flag warnings
    if (msg.includes('React Router Future Flag Warning')) return;
    warn(...args);
  };
}
