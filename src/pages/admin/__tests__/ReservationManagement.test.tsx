import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import ReservationManagement from '../ReservationManagement';

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
      }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('ReservationManagement', () => {
  it('renders search field and statistics', async () => {
    render(<ReservationManagement />);

    expect(
      await screen.findByText(/Gestion des Réservations/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Rechercher par email/i)
    ).toBeInTheDocument();
  });
});