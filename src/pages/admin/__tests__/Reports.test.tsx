import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
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
  it('should render reports title', async () => {
    render(<Reports />);
    
    await waitFor(() => {
      expect(screen.getByText(/rapports et analyses/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render date filters', async () => {
    render(<Reports />);
    
    await waitFor(() => {
      expect(screen.getByText(/date de début/i)).toBeInTheDocument();
      expect(screen.getByText(/date de fin/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render export button', async () => {
    render(<Reports />);
    
    await waitFor(() => {
      expect(screen.getByText(/exporter/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render KPI cards', async () => {
    render(<Reports />);
    
    await waitFor(() => {
      expect(screen.getByText(/chiffre d'affaires/i)).toBeInTheDocument();
      expect(screen.getByText(/réservations/i)).toBeInTheDocument();
      expect(screen.getByText(/prix moyen/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});