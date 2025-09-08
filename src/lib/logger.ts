/* eslint-disable no-console */

export type LogFn = (...args: readonly unknown[]) => void;

export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

/**
 * Vite expose des types globaux via `vite/client`.
 * On peut donc utiliser `import.meta.env.DEV` sans cast en `any`.
 */
const isDev =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

export const logger: Logger = {
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

/** Compat rétro si tu l’utilises ailleurs */
export const debugLog: LogFn = (...args) => logger.debug(...args);
