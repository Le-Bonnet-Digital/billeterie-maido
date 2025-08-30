import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEventDetails } from '../useEventDetails';
import { fetchEvent, fetchPasses, fetchTimeSlots } from '../../lib/eventDetails';

vi.mock('../../lib/eventDetails', () => ({
  fetchEvent: vi.fn(),
  fetchPasses: vi.fn(),
  fetchTimeSlots: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEventDetails', () => {
  it('aggregates data from services', async () => {
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
        event_activities: [
          {
            id: 'ea1',
            activity_id: 'a1',
            stock_limit: null,
            requires_time_slot: false,
            remaining_stock: 3,
            activity: { id: 'a1', name: 'Act', description: '', icon: 'icon' },
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useEventDetails('1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.event?.name).toBe('Event');
    expect(result.current.passes).toHaveLength(1);
    expect(result.current.eventActivities).toHaveLength(1);
  });

  it('handles errors from services', async () => {
    (fetchEvent as Mock).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useEventDetails('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("doesn't load data when eventId is missing", async () => {
    const { result } = renderHook(() => useEventDetails());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchEvent).not.toHaveBeenCalled();
  });

  it('sets error and returns empty array if loadTimeSlotsForActivity fails', async () => {
    (fetchEvent as Mock).mockResolvedValue({
      id: '1',
      name: 'Event',
      event_date: '2024-01-01',
      key_info_content: 'info',
    });
    (fetchPasses as Mock).mockResolvedValue([]);
    (fetchTimeSlots as Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useEventDetails('1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let slots: unknown;
    await act(async () => {
      slots = await result.current.loadTimeSlotsForActivity('activity-1');
    });

    expect(slots).toEqual([]);
    expect(result.current.error).toBe('Erreur lors du chargement des créneaux');
  });
});
