/* eslint-disable no-console */
export const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.info(...args);
  }
};
