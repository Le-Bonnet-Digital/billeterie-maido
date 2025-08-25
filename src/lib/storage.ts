const memoryStorage: Record<string, string> = {};

export const safeStorage = {
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
