import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import EventFAQ from '../EventFAQ';
import { useFaq } from '../../hooks/useFaq';
import { toast } from 'react-hot-toast';

vi.mock('../../hooks/useFaq');

const mockedUseFaq = useFaq as unknown as jest.Mock;

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn() },
}));

describe('EventFAQ Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner and loading text when loading', () => {
    mockedUseFaq.mockReturnValue({
      event: null,
      faqs: [],
      loading: true,
      error: null,
    });

    const { container } = render(<EventFAQ />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText(/chargement de la faq/i)).toBeInTheDocument();
  });

  it('shows not found message when no event', () => {
    mockedUseFaq.mockReturnValue({
      event: null,
      faqs: [],
      loading: false,
      error: null,
    });

    render(<EventFAQ />);

    expect(screen.getByText(/faq introuvable/i)).toBeInTheDocument();
  });

  it('renders event name and FAQ content', async () => {
    mockedUseFaq.mockReturnValue({
      event: { id: '1', name: 'Event' },
      faqs: [{ question: 'Q', answer: 'A' }],
      loading: false,
      error: null,
    });

    render(<EventFAQ />);

    expect(screen.getByText('Event')).toBeInTheDocument();
    const question = screen.getByText('Q');
    expect(question).toBeInTheDocument();
    fireEvent.click(question);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
  });

  it('displays error toast when request fails', async () => {
    mockedUseFaq.mockReturnValue({
      event: null,
      faqs: [],
      loading: false,
      error: new Error('fail'),
    });

    render(<EventFAQ />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Erreur lors du chargement de la FAQ',
      );
    });
    expect(screen.getByText(/faq introuvable/i)).toBeInTheDocument();
  });
});
