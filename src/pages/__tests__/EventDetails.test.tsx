import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import EventDetails from '../EventDetails';

// Mock the supabase calls
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-event-id',
              name: 'Test Event',
              event_date: '2024-12-25',
              key_info_content: 'Test information'
            },
            error: null
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 10, error: null }))
  },
  isSupabaseConfigured: vi.fn(() => true)
}));

describe('EventDetails Page', () => {
  it('should render event information when loaded', async () => {
    render(<EventDetails />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText('Test information')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(<EventDetails />);
    
    expect(screen.getByText(/chargement de l'événement/i)).toBeInTheDocument();
  });

  it('should render passes section', async () => {
    render(<EventDetails />);
    
    await waitFor(() => {
      expect(screen.getByText(/nos pass/i)).toBeInTheDocument();
    });
  });
});