import { describe, it, expect, vi } from 'vitest';
import { fetchEventStock } from '../eventStock';
import type { DatabaseClient } from '../supabase';

describe('fetchEventStock', () => {
  it('propagates errors from supabase.rpc', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('fail'));
    const client = { rpc } as unknown as DatabaseClient;

    await expect(fetchEventStock('event1', client)).rejects.toThrow('fail');
  });

  it('returns passes and activities with their stock', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        passes: [
          { id: 'p1', name: 'Pass', price: 10, description: '', initial_stock: 10, remaining_stock: 5 },
        ],
        event_activities: [
          {
            id: 'ea1',
            activity_id: 'a1',
            stock_limit: 5,
            requires_time_slot: false,
            remaining_stock: 2,
            activity: { id: 'a1', name: 'Poney', description: '', icon: '🐴' },
          },
        ],
      },
      error: null,
    });
    const client = { rpc } as unknown as DatabaseClient;

    const result = await fetchEventStock('event1', client);

    expect(rpc).toHaveBeenCalledWith('get_event_passes_activities_stock', { event_uuid: 'event1' });
    expect(result).toEqual({
      passes: [
        { id: 'p1', name: 'Pass', price: 10, description: '', initial_stock: 10, remaining_stock: 5 },
      ],
      eventActivities: [
        {
          id: 'ea1',
          activity_id: 'a1',
          stock_limit: 5,
          requires_time_slot: false,
          remaining_stock: 2,
          activity: { id: 'a1', name: 'Poney', description: '', icon: '🐴' },
        },
      ],
    });
  });
});
