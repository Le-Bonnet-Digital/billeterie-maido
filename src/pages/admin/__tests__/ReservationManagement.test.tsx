import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
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
  it('should render reservations management title', async () => {
    render(<ReservationManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/gestion des réservations/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render search and filter controls', async () => {
    render(<ReservationManagement />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher par email/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/tous les statuts/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render export button', async () => {
    render(<ReservationManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/exporter csv/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render statistics cards', async () => {
    render(<ReservationManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/total réservations/i)).toBeInTheDocument();
      expect(screen.getByText(/payées/i)).toBeInTheDocument();
      expect(screen.getByText(/en attente/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});