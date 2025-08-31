import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '../supabase';
import { fetchEvent, fetchPasses, fetchTimeSlots } from '../eventDetails';

const from = supabase.from as unknown as Mock;
const rpc = supabase.rpc as unknown as Mock;

beforeEach(() => {
  from.mockReset();
  rpc.mockReset();
});

describe('fetchEvent', () => {
  it('retrieves a published event', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'e1',
        name: 'Event',
        event_date: '2025-01-01',
        key_info_content: 'info',
      },
      error: null,
    });
    const query = { select: vi.fn(), eq: vi.fn(), single } as {
      select: Mock;
      eq: Mock;
      single: Mock;
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    from.mockReturnValue(query);

    const result = await fetchEvent('e1');

    expect(from).toHaveBeenCalledWith('events');
    expect(query.select).toHaveBeenCalledWith(
      'id, name, event_date, key_info_content',
    );
    expect(query.eq.mock.calls).toEqual([
      ['id', 'e1'],
      ['status', 'published'],
    ]);
    expect(result.name).toBe('Event');
  });

  it('throws when query fails', async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('fail') });
    const query = { select: vi.fn(), eq: vi.fn(), single } as {
      select: Mock;
      eq: Mock;
      single: Mock;
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    from.mockReturnValue(query);

    await expect(fetchEvent('e1')).rejects.toThrow('fail');
  });
});

describe('fetchPasses', () => {
  it('retrieves passes with their activities and remaining stock', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'p1',
          name: 'P1',
          price: 10,
          description: '',
          initial_stock: null,
          remaining_stock: 5,
          event_activities: [
            {
              id: 'ea1',
              activity_id: 'a1',
              stock_limit: null,
              requires_time_slot: false,
              remaining_stock: 3,
              activity: {
                id: 'a1',
                name: 'Act',
                description: '',
                icon: 'icon',
              },
            },
          ],
        },
      ],
      error: null,
    });

    const result = await fetchPasses('e1');

    expect(rpc).toHaveBeenCalledWith('get_passes_with_activities', {
      event_uuid: 'e1',
    });
    expect(result[0].event_activities[0].activity.name).toBe('Act');
  });

  it('throws when rpc fails', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('boom') });

    await expect(fetchPasses('e1')).rejects.toThrow('boom');
  });
});

describe('fetchTimeSlots', () => {
  it('retrieves time slots with remaining capacity', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 's1',
          slot_time: '2025-01-01T10:00:00Z',
          capacity: 5,
          event_activities: [
            {
              id: 'ea1',
              activity_id: 'a1',
              stock_limit: null,
              requires_time_slot: false,
              activities: {
                id: 'a1',
                name: 'Act',
                description: '',
                icon: 'icon',
              },
            },
          ],
        },
      ],
      error: null,
    });
    const gte = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });
    rpc.mockResolvedValueOnce({ data: 4 });

    const result = await fetchTimeSlots('ea1');

    expect(from).toHaveBeenCalledWith('time_slots');
    expect(eq).toHaveBeenCalledWith('event_activity_id', 'ea1');
    expect(gte).toHaveBeenCalledWith('slot_time', expect.any(String));
    expect(order).toHaveBeenCalledWith('slot_time');
    expect(result[0].remaining_capacity).toBe(4);
    expect(result[0].event_activity.activity.name).toBe('Act');
    expect(rpc).toHaveBeenCalledWith('get_slot_remaining_capacity', {
      slot_uuid: 's1',
    });
  });

  it('throws when query fails', async () => {
    const order = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('fail') });
    const gte = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    await expect(fetchTimeSlots('ea1')).rejects.toThrow('fail');
  });
});
