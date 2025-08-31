import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import EventDetails from '../EventDetails';
import useEventDetails from '../../hooks/useEventDetails';
import { addToCart } from '../../lib/cart';

vi.mock('../../hooks/useEventDetails');
vi.mock('../../lib/cart', () => ({ addToCart: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ eventId: 'test-event-id' }) };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EventDetails Page', () => {
  it('renders loading state', () => {
    vi.mocked(useEventDetails).mockReturnValue({
      event: null,
      passes: [],
      eventActivities: [],
      loading: true,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    });

    render(<EventDetails />);

    expect(screen.getByText(/chargement de l'événement/i)).toBeInTheDocument();
  });

  it('renders event not found state', () => {
    vi.mocked(useEventDetails).mockReturnValue({
      event: null,
      passes: [],
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    });

    render(<EventDetails />);

    expect(screen.getByText(/événement introuvable/i)).toBeInTheDocument();
  });

  it('adds pass with predefined activities to cart through modal', async () => {
    const refresh = vi.fn();
    vi.mocked(useEventDetails).mockReturnValue({
      event: {
        id: 'test-event-id',
        name: 'Test Event',
        event_date: '2024-12-25',
        key_info_content: 'Info',
      },
      passes: [
        {
          id: 'pass1',
          name: 'Pass 1',
          price: 10,
          description: 'desc',
          initial_stock: 10,
          remaining_stock: 5,
          event_activities: [
            {
              id: 'activity1',
              activity: {
                name: 'Activity 1',
                description: 'activity desc',
                icon: '🎉',
              },
              stock_limit: null,
              requires_time_slot: false,
            },
            {
              id: 'activity2',
              activity: {
                name: 'Activity 2',
                description: 'activity2 desc',
                icon: '🎯',
              },
              stock_limit: null,
              requires_time_slot: false,
            },
          ],
        },
      ],
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh,
    } as unknown as ReturnType<typeof useEventDetails>);

    vi.mocked(addToCart).mockResolvedValue(true);

    render(<EventDetails />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter au panier/i }));
    const modalButton = screen.getAllByRole('button', {
      name: /ajouter au panier/i,
    })[1];
    fireEvent.click(modalButton);

    await waitFor(() => {
      expect(addToCart).toHaveBeenCalledTimes(1);
      expect(addToCart).toHaveBeenCalledWith(
        'pass1',
        [
          { eventActivityId: 'activity1', timeSlotId: undefined },
          { eventActivityId: 'activity2', timeSlotId: undefined },
        ],
        1,
        undefined,
        undefined,
        expect.anything(),
      );
      expect(refresh).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/configurer votre achat/i),
      ).not.toBeInTheDocument();
    });
  });

  it('hides last name field for baby poney passes', async () => {
    vi.mocked(useEventDetails).mockReturnValue({
      event: {
        id: 'event',
        name: 'Event',
        event_date: '2024-12-25',
        key_info_content: 'Info',
      },
      passes: [
        {
          id: 'pass-baby',
          name: 'Pass Baby',
          price: 10,
          description: 'desc',
          initial_stock: 10,
          remaining_stock: 5,
          pass_type: 'baby_poney',
          event_activities: [],
        },
      ],
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useEventDetails>);

    render(<EventDetails />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter au panier/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/^Nom$/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/prénom/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/année de naissance/i),
      ).toBeInTheDocument();
    });
  });
});
