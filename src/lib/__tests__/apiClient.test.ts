import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiCall } from '../apiClient';
import { logger } from '../logger';

vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));
import { toast } from 'react-hot-toast';

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on failure and eventually succeeds', async () => {
    const op = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: new Error('fail') })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const result = await apiCall(() => op(), 'def', 'test');
    expect(op).toHaveBeenCalledTimes(2);
    expect(result).toBe('ok');
  });

  it('returns default value after retries', async () => {
    const op = vi.fn().mockResolvedValue({ data: null, error: new Error('fail') });
    const spy = vi.spyOn(logger, 'error');
    const result = await apiCall(() => op(), 'def', 'test');
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
