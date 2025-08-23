import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import EventManagement from '../EventManagement';

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

describe('EventManagement', () => {
  it('should render events management title', async () => {
    render(<EventManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/gestion des événements/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render create event button', async () => {
    render(<EventManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/nouvel événement/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show empty state when no events', async () => {
    render(<EventManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/aucun événement/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should open create modal when button clicked', async () => {
    render(<EventManagement />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText(/nouvel événement/i));
      expect(screen.getByText(/créer un événement/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});