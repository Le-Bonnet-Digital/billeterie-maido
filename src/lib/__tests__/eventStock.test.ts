/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { fetchEventStock } from '../eventStock';

describe('fetchEventStock', () => {
  it('retrieves passes and activities with their stock', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        passes: [{ id: 'p1', name: 'Pass', price: 10, description: '', initial_stock: 10, remaining_stock: 5 }],
        event_activities: [{
          id: 'ea1',
          activity_id: 'a1',
          stock_limit: 5,
          requires_time_slot: false,
          remaining_stock: 2,
          activity: { id: 'a1', name: 'Poney', description: '', icon: '🐴' },
        }],
      },
      error: null,
    });
    const client = { rpc } as any;

    const result = await fetchEventStock('event1', client);
    expect(rpc).toHaveBeenCalledWith('get_event_passes_activities_stock', { event_uuid: 'event1' });
    expect(result.passes[0].remaining_stock).toBe(5);
    expect(result.eventActivities[0].activity.name).toBe('Poney');
  });

  it('throws when rpc returns an error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('fail') });
    const client = { rpc } as any;

    await expect(fetchEventStock('event1', client)).rejects.toThrow('fail');
  });
});
