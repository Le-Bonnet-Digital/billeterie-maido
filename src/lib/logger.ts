export function debugLog(...args: unknown[]): void {
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
    console.log(...args);
  }
}
