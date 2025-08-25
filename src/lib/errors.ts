/**
 * Convertit une valeur inconnue en message d'erreur lisible.
 * @param err Erreur à analyser
 * @returns Message d'erreur
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  if (err == null) {
    return '';
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
