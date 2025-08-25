import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import EventFAQ from '../EventFAQ';
import { useFaq } from '../../hooks/useFaq';
import { toast } from 'react-hot-toast';

vi.mock('../../hooks/useFaq');

describe('EventFAQ Page', () => {
  it('shows spinner and loading text when loading', () => {
    (useFaq as unknown as any).mockReturnValue({ event: null, faqs: [], loading: true });

    const { container } = render(<EventFAQ />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText(/chargement de la faq/i)).toBeInTheDocument();
  });

  it('shows not found message when no event', () => {
    (useFaq as unknown as any).mockReturnValue({ event: null, faqs: [], loading: false });

    render(<EventFAQ />);

    expect(screen.getByText(/faq introuvable/i)).toBeInTheDocument();
  });

  it('renders event name and FAQ content', () => {
    (useFaq as unknown as any).mockReturnValue({
      event: { id: '1', name: 'Event' },
      faqs: [{ question: 'Q', answer: 'A' }],
      loading: false,
    });

    render(<EventFAQ />);

    expect(screen.getByText('Event')).toBeInTheDocument();
    const question = screen.getByText('Q');
    expect(question).toBeInTheDocument();
    fireEvent.click(question);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('displays error toast when request fails', async () => {
    (useFaq as unknown as any).mockReturnValue({
      event: null,
      faqs: [],
      loading: false,
      error: new Error('network'),
    });

    render(<EventFAQ />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
