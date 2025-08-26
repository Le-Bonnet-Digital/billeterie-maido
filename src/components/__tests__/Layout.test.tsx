import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout';

// Mock cart functions
vi.mock('../../lib/cart', () => ({
  getCartItems: vi.fn(() => Promise.resolve([])),
}));

describe('Layout Component', () => {
  it('should render header with logo and navigation', () => {
    render(<Layout />);

    expect(
      screen.getByRole('link', { name: /BilletEvent/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/événements/i)).toBeInTheDocument();
    expect(screen.getByText('Retrouver mon Billet')).toBeInTheDocument();
  });

  it('should render admin link', () => {
    render(<Layout />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});