import { describe, it, expect, vi } from 'vitest';
import { wait } from '../wait';

describe('wait', () => {
  it('resolves after the specified delay', async () => {
    vi.useFakeTimers();

    const ms = 100;
    const spy = vi.fn();
    const promise = wait(ms).then(spy);

    vi.advanceTimersByTime(ms - 1);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await promise;
    expect(spy).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
