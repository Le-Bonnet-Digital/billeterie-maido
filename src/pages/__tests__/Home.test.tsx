import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../Home';

// Mock supabase as not configured to simplify component rendering
vi.mock('../../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: vi.fn(() => false)
}));

describe('Home Page (Boutique)', () => {
  it('renders boutique hero', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/Billetterie/i)).toBeInTheDocument();
    });
  });

  it('renders park tickets section heading', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Activités à la carte/i })).toBeInTheDocument();
    });
  });
});
