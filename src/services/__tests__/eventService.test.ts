/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEvent, fetchTimeSlotsForActivity, fetchPasses, fetchEventActivities } from '../eventService';

const from = vi.fn((table: string) => {
  if (table === 'events') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Event', event_date: '2024-01-01', key_info_content: 'Info' }, error: null }),
    } as any;
  }
  if (table === 'time_slots') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'slot1',
              slot_time: '2024-01-01T10:00:00Z',
              capacity: 10,
              event_activities: {
                id: 'ea1',
                activity_id: 'a1',
                stock_limit: null,
                requires_time_slot: true,
                activities: { id: 'a1', name: 'Act', description: 'Desc', icon: '🎯' },
              },
            },
          ],
          error: null,
        }),
      }),
    } as any;
  }
  return {} as any;
});

const rpc = vi.fn((fn: string) => {
  if (fn === 'get_slot_remaining_capacity') {
    return Promise.resolve({ data: 5 });
  }
  if (fn === 'get_event_passes_activities_stock') {
    return Promise.resolve({
      data: {
        passes: [
          {
            id: 'p1',
            name: 'Pass',
            price: 10,
            description: 'Desc',
            initial_stock: 100,
            remaining_stock: 50,
          },
        ],
        event_activities: [
          {
            id: 'ea1',
            activity_id: 'a1',
            stock_limit: null,
            requires_time_slot: false,
            remaining_stock: 3,
            activity: { id: 'a1', name: 'Act', description: 'Desc', icon: '🎯' },
          },
        ],
      },
    });
  }
  return Promise.resolve({ data: null });
});

const client = { from, rpc } as any;

beforeEach(() => {
  from.mockClear();
  rpc.mockClear();
});

describe('eventService', () => {
  it('fetchEvent returns event data', async () => {
    const event = await fetchEvent('1', client);
    expect(event?.name).toBe('Event');
  });

  it('fetchTimeSlotsForActivity returns slots with remaining capacity', async () => {
    const slots = await fetchTimeSlotsForActivity('ea1', client);
    expect(slots[0].remaining_capacity).toBe(5);
    expect(slots[0].event_activity.activity.name).toBe('Act');
  });

  it('fetchPasses uses grouped RPC to return remaining stock', async () => {
    const passes = await fetchPasses('1', client);
    expect(passes[0].remaining_stock).toBe(50);
    expect(rpc).toHaveBeenCalledWith('get_event_passes_activities_stock', {
      event_uuid: '1',
    });
  });

  it('fetchEventActivities uses grouped RPC to return remaining stock', async () => {
    const activities = await fetchEventActivities('1', client);
    expect(activities[0].remaining_stock).toBe(3);
    expect(activities[0].activity.name).toBe('Act');
    expect(rpc).toHaveBeenCalledWith('get_event_passes_activities_stock', {
      event_uuid: '1',
    });
  });
});
