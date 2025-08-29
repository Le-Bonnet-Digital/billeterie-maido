import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import EventDetails from '../EventDetails';
import useEventDetails from '../../hooks/useEventDetails';

vi.mock('../../hooks/useEventDetails');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ eventId: 'event-1' }) };
});

describe('EventDetails luge seule gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseEvent = {
    id: 'event-1',
    name: 'Event',
    event_date: '2025-01-01',
    key_info_content: 'Info',
  };

  function mockUseEventDetails(passes: Array<import('../../lib/types').Pass>) {
    vi.mocked(useEventDetails).mockReturnValue({
      event: baseEvent,
      passes,
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useEventDetails>);
  }

  it('disables Pass Luge Seule when -8 or +8 still have stock', () => {
    mockUseEventDetails([
      { id: 'p-moins', name: 'Pass Moins de 8 ans', price: 9, description: '', initial_stock: 10, remaining_stock: 1 },
      { id: 'p-plus', name: 'Pass Plus de 8 ans', price: 9, description: '', initial_stock: 10, remaining_stock: 0 },
      { id: 'p-luge', name: 'Pass Luge Seule', price: 7, description: '', initial_stock: null, remaining_stock: 999999 },
    ]);

    render(<EventDetails />);

    const lugeHeading = screen.getByRole('heading', { name: /pass luge seule/i });
    const headerDiv = lugeHeading.closest('div');
    const card = headerDiv?.parentElement as HTMLElement | null; // card contains button
    expect(card).toBeTruthy();
    const button = card!.querySelector('button');
    expect(button).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables Pass Luge Seule when both -8 and +8 are sold out', () => {
    mockUseEventDetails([
      { id: 'p-moins', name: 'Pass Moins de 8 ans', price: 9, description: '', initial_stock: 10, remaining_stock: 0 },
      { id: 'p-plus', name: 'Pass Plus de 8 ans', price: 9, description: '', initial_stock: 10, remaining_stock: 0 },
      { id: 'p-luge', name: 'Pass Luge Seule', price: 7, description: '', initial_stock: null, remaining_stock: 999999 },
    ]);

    render(<EventDetails />);

    const lugeHeading = screen.getByRole('heading', { name: /pass luge seule/i });
    const headerDiv = lugeHeading.closest('div');
    const card = headerDiv?.parentElement as HTMLElement | null;
    const button = card!.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
