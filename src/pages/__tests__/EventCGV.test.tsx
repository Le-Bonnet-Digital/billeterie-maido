import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen } from '../../test/utils';
import { toast } from 'react-hot-toast';
import EventCGV from '../EventCGV';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as unknown as Mock;

const createQueryBuilder = () => {
  const single = vi.fn();
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single,
  };
  return { builder, single };
};

describe('EventCGV Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFrom.mockReset();
  });

  it('shows loading spinner while fetching CGV', () => {
    const { builder, single } = createQueryBuilder();
    single.mockReturnValue(new Promise(() => {}));
    mockFrom.mockReturnValue(builder);

    render(<EventCGV />);

    expect(screen.getByText(/chargement des cgv/i)).toBeInTheDocument();
  });

  it('renders event name and markdown content on success', async () => {
    const { builder, single } = createQueryBuilder();
    single.mockResolvedValue({
      data: {
        id: '1',
        name: 'Test Event',
        cgv_content: '# Title\n\nThis is **content**',
      },
      error: null,
    });
    mockFrom.mockReturnValue(builder);

    render(<EventCGV />);

    expect(await screen.findByText('Test Event')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === 'This is content'),
    ).toBeInTheDocument();
    expect(screen.getByText('content').tagName).toBe('STRONG');
  });

  it('renders fallback when no CGV data', async () => {
    const { builder, single } = createQueryBuilder();
    single.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    render(<EventCGV />);

    expect(await screen.findByText(/cgv introuvables/i)).toBeInTheDocument();
  });

  it('handles error by showing toast and fallback', async () => {
    const { builder, single } = createQueryBuilder();
    single.mockRejectedValue(new Error('oops'));
    mockFrom.mockReturnValue(builder);

    render(<EventCGV />);

    expect(await screen.findByText(/cgv introuvables/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Erreur lors du chargement des CGV');
  });
});
