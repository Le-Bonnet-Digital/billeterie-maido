import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout';

// Mock auth to return an admin user for Admin link rendering
vi.mock('../../lib/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: '1', email: 'admin@example.com', role: 'admin' }))
}));

// Mock cart functions
vi.mock('../../lib/cart', () => ({
  getCartItems: vi.fn(() => Promise.resolve([])),
}));

describe('Layout Component', () => {
  it('should render header navigation', () => {
    render(<Layout />);

    const billetterieLinks = screen.getAllByText(/Billetterie/i);
    expect(billetterieLinks.length).toBeGreaterThan(0);

    const findTicketLinks = screen.getAllByText('Retrouver mon Billet');
    expect(findTicketLinks.length).toBeGreaterThan(0);
  });

  it('should render admin link', async () => {
    render(<Layout />);
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });
});
