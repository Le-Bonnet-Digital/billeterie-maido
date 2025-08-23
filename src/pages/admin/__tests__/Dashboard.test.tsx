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
  it('should render dashboard title', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/tableau de bord/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render statistics cards', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/événements total/i)).toBeInTheDocument();
      expect(screen.getByText(/événements actifs/i)).toBeInTheDocument();
      expect(screen.getByText(/réservations/i)).toBeInTheDocument();
      expect(screen.getByText(/chiffre d'affaires/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render quick actions', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/actions rapides/i)).toBeInTheDocument();
      expect(screen.getByText(/créer un événement/i)).toBeInTheDocument();
      expect(screen.getByText(/voir les réservations/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});