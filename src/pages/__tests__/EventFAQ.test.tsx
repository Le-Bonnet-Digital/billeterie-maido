import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { toast } from 'react-hot-toast';

vi.mock('../../hooks/useFaq', () => ({
  useFaq: vi.fn(),
}));

import EventFAQ from '../EventFAQ';
import { useFaq } from '../../hooks/useFaq';

const mockedUseFaq = vi.mocked(useFaq);

describe('EventFAQ Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display FAQ when loaded', () => {
    mockedUseFaq.mockReturnValue({
      event: { id: '1', name: 'Test Event' },
      faqs: [],
      loading: false,
      error: null,
    });

    render(<EventFAQ />);

    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('should show error message when loading fails', async () => {
    mockedUseFaq.mockReturnValue({
      event: null,
      faqs: [],
      loading: false,
      error: new Error('fail'),
    });

    render(<EventFAQ />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors du chargement de la FAQ');
    });
    expect(screen.getByText(/FAQ introuvable/i)).toBeInTheDocument();
  });
});
