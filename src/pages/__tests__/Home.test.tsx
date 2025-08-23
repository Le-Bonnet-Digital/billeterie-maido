import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../Home';

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [
              {
                id: '1',
                name: 'Test Event',
                event_date: '2024-12-25',
                sales_opening_date: '2024-01-01T00:00:00Z',
                sales_closing_date: '2024-12-24T23:59:59Z',
                key_info_content: 'Test info'
              }
            ], 
            error: null 
          }))
        }))
      }))
    }))
  },
  isSupabaseConfigured: vi.fn(() => true)
}));

describe('Home Page', () => {
  it('should render hero section', async () => {
    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText(/découvrez nos événements/i)).toBeInTheDocument();
    });
  });

  it('should render events when loaded', async () => {
    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
  });
});