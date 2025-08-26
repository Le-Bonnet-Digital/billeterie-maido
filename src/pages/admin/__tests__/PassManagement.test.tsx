import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import PassManagement from '../PassManagement';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({ data: 0, error: null }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('PassManagement', () => {
  it('shows pass header and creation button', async () => {
    render(<PassManagement />);

    expect(await screen.findByText(/Gestion des Pass/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Nouveau Pass/i })
    ).toBeInTheDocument();
  });
});