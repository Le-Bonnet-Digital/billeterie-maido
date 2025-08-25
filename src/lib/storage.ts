const memoryStorage: Record<string, string> = {};

/**
 * Wrapper autour du stockage local qui fonctionne aussi côté serveur.
 */
export const safeStorage = {
  /**
   * Récupère un élément du stockage.
   * @param key Clé de l'élément
   * @returns Valeur associée ou `null`
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return memoryStorage[key] ?? null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStorage[key] ?? null;
    }
  },

  /**
   * Stocke une valeur.
   * @param key Clé de l'élément
   * @param value Valeur à stocker
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      memoryStorage[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  },

  /**
   * Supprime une valeur du stockage.
   * @param key Clé de l'élément
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      delete memoryStorage[key];
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  },
};
