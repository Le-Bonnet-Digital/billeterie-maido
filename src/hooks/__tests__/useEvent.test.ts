import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEvent } from '../useEvent';
import {
  fetchEvent,
  fetchPasses,
  fetchEventActivities,
} from '../../services/eventService';

vi.mock('../../services/eventService', () => ({
  fetchEvent: vi.fn(),
  fetchPasses: vi.fn(),
  fetchEventActivities: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEvent', () => {
  it('returns event data from services', async () => {
    (fetchEvent as Mock).mockResolvedValue({
      id: '1',
      name: 'Event',
      event_date: '2024-01-01',
      key_info_content: 'info',
    });
    (fetchPasses as Mock).mockResolvedValue([
      {
        id: 'p1',
        name: 'Pass 1',
        price: 10,
        description: 'desc',
        initial_stock: 10,
        remaining_stock: 5,
      },
    ]);
    (fetchEventActivities as Mock).mockResolvedValue([
      {
        id: 'a1',
        activity_id: 'act1',
        stock_limit: 10,
        requires_time_slot: false,
        activity: { id: 'act1', name: 'Act', description: 'desc', icon: 'i' },
      },
    ]);

    const { result } = renderHook(() => useEvent('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.event?.name).toBe('Event');
    expect(result.current.passes).toHaveLength(1);
    expect(result.current.eventActivities).toHaveLength(1);
  });

  it('handles service errors', async () => {
    (fetchEvent as Mock)
      .mockResolvedValueOnce({
        id: '1',
        name: 'Event',
        event_date: '2024-01-01',
        key_info_content: 'info',
      })
      .mockRejectedValueOnce(new Error('fail'));
    (fetchPasses as Mock).mockResolvedValueOnce([]).mockResolvedValue([]);
    (fetchEventActivities as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);

    const { result } = renderHook(() => useEvent('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.event?.name).toBe('Event');

    await act(async () => {
      await expect(result.current.reload()).rejects.toThrow('fail');
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.event?.name).toBe('Event');
  });
});
