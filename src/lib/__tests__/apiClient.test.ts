import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiCall } from '../apiClient';
import { logger } from '../logger';

vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));
import { toast } from 'react-hot-toast';

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on failure and eventually succeeds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const op = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: new Error('fail') })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const resultPromise = apiCall(() => op(), 'def', 'test');
    await vi.runAllTimersAsync();
    vi.runAllTimers();
    const result = await resultPromise;
    expect(op).toHaveBeenCalledTimes(2);
    expect(result).toBe('ok');
  });

  it('returns default value after retries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const op = vi.fn().mockResolvedValue({ data: null, error: new Error('fail') });
    const spy = vi.spyOn(logger, 'error');
    const resultPromise = apiCall(() => op(), 'def', 'test');
    await vi.runAllTimersAsync();
    vi.runAllTimers();
    const result = await resultPromise;
    expect(op).toHaveBeenCalledTimes(3);
    expect(result).toBe('def');
    expect(spy).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('handles offline scenario', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const op = vi.fn();
    const result = await apiCall(() => op(), [], 'offline');
    expect(op).not.toHaveBeenCalled();
    expect(result).toEqual([]);
    expect(toast.error).toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});
