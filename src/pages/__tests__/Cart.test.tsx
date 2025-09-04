import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import Cart from '../Cart';

// Mock cart functions
vi.mock('../../lib/cart', () => ({
  getCartItems: vi.fn(() => Promise.resolve([])),
  removeFromCart: vi.fn(() => Promise.resolve(true)),
  calculateCartTotal: vi.fn(() => 0),
  clearCart: vi.fn(() => Promise.resolve(true)),
}));

describe('Cart Page', () => {
  it('should render empty cart message when no items', async () => {
    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/votre panier est vide/i)).toBeInTheDocument();
    });
  });

  it('should render cart header', async () => {
    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/mon panier/i)).toBeInTheDocument();
    });
  });

  it('should render navigation link', async () => {
    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/continuer mes achats/i)).toBeInTheDocument();
    });
  });

  it('should render cart items when present', async () => {
    const { getCartItems, calculateCartTotal } = await import('../../lib/cart');

    vi.mocked(getCartItems).mockResolvedValue([
      {
        id: '1',
        pass: {
          id: '1',
          name: 'Test Pass',
          price: 25,
          description: 'Test description',
        },
        quantity: 1,
      },
    ]);
    vi.mocked(calculateCartTotal).mockReturnValue(25);

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText('Test Pass')).toBeInTheDocument();
      expect(screen.getByText('25€')).toBeInTheDocument();
    });
  });

  it('disables payment until CGV accepted', async () => {
    const { getCartItems, calculateCartTotal } = await import('../../lib/cart');

    vi.mocked(getCartItems).mockResolvedValue([
      {
        id: '1',
        pass: { id: '1', name: 'Pass', price: 10, description: 'Desc' },
        quantity: 1,
      },
    ]);
    vi.mocked(calculateCartTotal).mockReturnValue(10);

    render(<Cart />);

    const payButton = await screen.findByRole('button', {
      name: /procéder au paiement/i,
    });

    expect(payButton).toBeDisabled();

    const termsButton = screen.getByRole('button', {
      name: /conditions générales de vente/i,
    });
    termsButton.click();

    await waitFor(() => expect(payButton).toBeEnabled());
  });
});
