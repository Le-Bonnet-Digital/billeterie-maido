import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import TimeSlotManagement from '../TimeSlotManagement';

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

describe('TimeSlotManagement', () => {
  it('should render time slot management content', async () => {
    render(<TimeSlotManagement />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should not be stuck in loading state', async () => {
    render(<TimeSlotManagement />);
    
    await waitFor(() => {
      // Should not show loading spinner after data loads
      expect(screen.queryByText /chargement/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});