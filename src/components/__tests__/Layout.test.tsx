import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import Layout from '../Layout';

// Mock auth to return an admin user for Admin link rendering
vi.mock('../../lib/auth', () => ({
  getCurrentUser: vi.fn(() =>
    Promise.resolve({ id: '1', email: 'admin@example.com', role: 'admin' }),
  ),
}));

// Mock cart functions
vi.mock('../../lib/cart', () => ({
  getCartItems: vi.fn(() => Promise.resolve([])),
}));

describe('Layout Component', () => {
  it('should render header navigation', async () => {
    await act(async () => {
      render(<Layout />);
    });

    const billetterieLinks = await screen.findAllByText(/Billetterie/i);
    expect(billetterieLinks.length).toBeGreaterThan(0);

    const findTicketLinks = await screen.findAllByText('Retrouver mon Billet');
    expect(findTicketLinks.length).toBeGreaterThan(0);
  });

  it('should render admin link', async () => {
    await act(async () => {
      render(<Layout />);
    });
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument());
  });
});
