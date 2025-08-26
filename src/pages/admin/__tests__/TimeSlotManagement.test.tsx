import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import TimeSlotManagement from '../TimeSlotManagement';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({ data: 0, error: null }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('TimeSlotManagement', () => {
  it('informs user when no event is selected', async () => {
    render(<TimeSlotManagement />);

    expect(
      await screen.findByText(/Planning des Créneaux/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sélectionnez un événement et une date/i)
    ).toBeInTheDocument();
  });
});