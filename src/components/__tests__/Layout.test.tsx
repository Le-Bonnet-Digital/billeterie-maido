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

    const eventLinks = screen.getAllByText(/événements/i);
    expect(eventLinks.length).toBeGreaterThan(0);

    const findTicketLinks = screen.getAllByText('Retrouver mon Billet');
    expect(findTicketLinks.length).toBeGreaterThan(0);
  });

  it('should render admin link', () => {
    render(<Layout />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});