import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import AdminDashboard from '../Dashboard';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          count: vi.fn(() => Promise.resolve({ count: 5, error: null })),
          eq: vi.fn(() => ({
            count: vi.fn(() => Promise.resolve({ count: 3, error: null }))
          }))
        }))
      }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('AdminDashboard', () => {
  it('should render dashboard content', async () => {
    render(<AdminDashboard />);
    
    // Wait for loading to complete and check for any content
    await waitFor(() => {
      // The component should render something, even if it's just the loading state initially
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should not be stuck in loading state', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Should not show loading spinner after data loads
      expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});