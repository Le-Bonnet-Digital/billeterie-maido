/* eslint-disable no-console -- This module intentionally wraps console methods to filter noisy dev logs */
/**
 * Install console filters to silence noisy third‑party dev warnings.
 * Only call this in development.
 */
export function installConsoleFilters(): void {
  const info = console.info.bind(console);
  const warn = console.warn.bind(console);
  const error = console.error.bind(console);

  console.info = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // React devtools suggestion
    if (msg.includes('Download the React DevTools')) return;
    info(...args);
  };

  console.warn = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    // React Router future flag warnings
    if (msg.includes('React Router Future Flag Warning')) return;
    // Recharts responsive container advice
    if (msg.includes('ResponsiveContainer')) return;
    // Supabase config noise
    if (
      msg.includes('Supabase configuration is missing') ||
      msg.includes('Supabase not configured')
    )
      return;
    warn(...args);
  };

  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    // Ignore React act warnings and application debug logs
    if (
      msg.startsWith('Warning: An update to') ||
      msg.includes('Supabase not configured') ||
      msg.includes('Supabase configuration is missing') ||
      msg.startsWith('Erreur') ||
      msg.includes('Functions are not valid as a React child')
    )
      return;
    error(...args);
  };
}
