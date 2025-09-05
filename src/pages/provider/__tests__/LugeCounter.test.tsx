import { render, screen, waitFor } from '@testing-library/react';
import LugeCounter from '../LugeCounter';
import { vi } from 'vitest';

vi.mock('../../../lib/supabase', () => {
  const select = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { count: 5 }, error: null }),
  });
  return {
    supabase: {
      from: vi.fn().mockReturnValue({ select }),
    },
  };
});

vi.mock('../../../lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));

test('affiche le compteur de luge', async () => {
  render(<LugeCounter />);
  await waitFor(() => {
    expect(screen.getByText('5')).toBeInTheDocument();
  });
  expect(screen.getByText(/Compteur Luge aujourd'hui/)).toBeInTheDocument();
});
