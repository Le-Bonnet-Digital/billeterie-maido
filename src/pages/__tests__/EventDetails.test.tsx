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

  it('adds pass to cart through modal', async () => {
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
        },
      ],
      eventActivities: [
        {
          id: 'activity1',
          activity: {
            name: 'Activity 1',
            description: 'activity desc',
            icon: '🎉',
          },
          stock_limit: null,
          remaining_stock: 5,
        },
      ],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh,
    });

    vi.mocked(addToCart).mockResolvedValue(true);

    render(<EventDetails />);

    fireEvent.click(screen.getByRole('button', { name: /ajouter au panier/i }));

    fireEvent.click(screen.getByRole('button', { name: /activity 1/i }));
    const modalButton = screen.getAllByRole('button', { name: /ajouter au panier/i })[1];
    fireEvent.click(modalButton);

    await waitFor(() => {
      expect(addToCart).toHaveBeenCalledWith('pass1', 'activity1');
      expect(refresh).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText(/configurer votre achat/i)).not.toBeInTheDocument();
    });
  });
});

