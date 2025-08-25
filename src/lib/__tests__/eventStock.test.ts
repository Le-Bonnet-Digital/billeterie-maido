import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
vi.mock('../supabase', () => {
  return {
    supabase: {
      rpc: vi.fn(),
    },
  };
});

import { supabase } from '../supabase';
import { fetchEventStock } from '../eventStock';

describe('fetchEventStock', () => {
  beforeEach(() => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('retrieves passes and activities with their stock', async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
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

    const result = await fetchEventStock('event1');
    expect(supabase.rpc).toHaveBeenCalledWith('get_event_passes_activities_stock', { event_uuid: 'event1' });
    expect(result.passes[0].remaining_stock).toBe(5);
    expect(result.eventActivities[0].activity.name).toBe('Poney');
  });

  it('throws when rpc returns an error', async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    await expect(fetchEventStock('event1')).rejects.toThrow('fail');
  });
});
