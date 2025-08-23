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
  it('should render time slot management title', async () => {
    render(<TimeSlotManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/gestion des créneaux/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render statistics cards', async () => {
    render(<TimeSlotManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/total créneaux/i)).toBeInTheDocument();
      expect(screen.getByText(/créneaux poney/i)).toBeInTheDocument();
      expect(screen.getByText(/créneaux tir à l'arc/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render create slot button', async () => {
    render(<TimeSlotManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/nouveau créneau/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});