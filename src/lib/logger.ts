export type LogContext = Record<string, unknown>;

function formatValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function formatContext(context: LogContext): string {
  return Object.entries(context)
    .map(([key, value]) => `${key}=${JSON.stringify(formatValue(value))}`)
    .join(' ');
}

function output(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
  if (level === 'debug' && !(import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true')) {
    return;
  }
  const ctx = context ? ` | ${formatContext(context)}` : '';
  const fn = level === 'debug' ? console.log : console[level];
  fn(`${message}${ctx}`);
}

export const logger = {
  debug: (message: string, context?: LogContext) => output('debug', message, context),
  info: (message: string, context?: LogContext) => output('info', message, context),
  warn: (message: string, context?: LogContext) => output('warn', message, context),
  error: (message: string, context?: LogContext) => output('error', message, context),
};

export function debugLog(message: string, context?: unknown): void {
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    logger.debug(message, context as LogContext);
  } else if (context !== undefined) {
    logger.debug(message, { value: context });
  } else {
    logger.debug(message);
  }
}
