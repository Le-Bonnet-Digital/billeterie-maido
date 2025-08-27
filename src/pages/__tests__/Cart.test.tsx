import { describe, it, expect, vi, afterAll } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import Cart from '../Cart';

// Mock cart functions
vi.mock('../../lib/cart', () => ({
  getCartItems: vi.fn(() => Promise.resolve([])),
  removeFromCart: vi.fn(() => Promise.resolve(true)),
  calculateCartTotal: vi.fn(() => 0),
}));

vi.stubEnv('VITE_TEST_DELAY_MS', '0');
afterAll(() => {
  vi.unstubAllEnvs();
});

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
          description: 'Test description'
        },
        quantity: 1
      }
    ]);
    vi.mocked(calculateCartTotal).mockReturnValue(25);
    
    render(<Cart />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Pass')).toBeInTheDocument();
      expect(screen.getByText('25€')).toBeInTheDocument();
    });
  });
});