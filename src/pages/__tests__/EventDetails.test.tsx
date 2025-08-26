import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import EventDetails from '../EventDetails';
import useEventDetails from '../../hooks/useEventDetails';

vi.mock('../../hooks/useEventDetails');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ eventId: 'test-event-id' }) };
});

describe('EventDetails Page', () => {
  it('should render event information when loaded', () => {
    vi.mocked(useEventDetails).mockReturnValue({
      event: {
        id: 'test-event-id',
        name: 'Test Event',
        event_date: '2024-12-25',
        key_info_content: 'Test information',
      },
      passes: [],
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    });

    render(<EventDetails />);

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test information')).toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
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

  it('should render passes section', () => {
    vi.mocked(useEventDetails).mockReturnValue({
      event: {
        id: 'test-event-id',
        name: 'Test Event',
        event_date: '2024-12-25',
        key_info_content: 'Info',
      },
      passes: [],
      eventActivities: [],
      loading: false,
      error: null,
      loadTimeSlotsForActivity: vi.fn(),
      refresh: vi.fn(),
    });

    render(<EventDetails />);

    expect(screen.getByText(/nos pass/i)).toBeInTheDocument();
  });
});
