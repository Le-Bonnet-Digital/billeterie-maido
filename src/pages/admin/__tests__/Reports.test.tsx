import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import Reports from '../Reports';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('Reports', () => {
  it('shows filters and export action', async () => {
    render(<Reports />);

    expect(
      await screen.findByText(/Rapports et Analyses/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exporter/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de début/i)).toBeInTheDocument();
  });
});