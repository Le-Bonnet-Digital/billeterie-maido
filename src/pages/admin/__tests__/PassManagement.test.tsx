import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
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
  it('should render pass management title', async () => {
    render(<PassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/gestion des pass/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render statistics cards', async () => {
    render(<PassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/total pass/i)).toBeInTheDocument();
      expect(screen.getByText(/en stock/i)).toBeInTheDocument();
      expect(screen.getByText(/prix moyen/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render create pass button', async () => {
    render(<PassManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/nouveau pass/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});