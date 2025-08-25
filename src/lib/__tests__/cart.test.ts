import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getSessionId, 
  addToCart, 
  getCartItems, 
  removeFromCart, 
  clearCart, 
  calculateCartTotal 
} from '../cart';
import type { CartItem, Pass } from '../cart';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'test-session-id' }
});

describe('Cart Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessionId', () => {
    it('should return existing session ID from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('existing-session-id');
      expect(getSessionId()).toBe('existing-session-id');
    });

    it('should create new session ID when none exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const sessionId = getSessionId();
      expect(sessionId).toBe('test-session-id');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('cart_session_id', 'test-session-id');
    });
  });

  describe('calculateCartTotal', () => {
    it('should calculate total correctly', () => {
      const pass1: Pass = { id: '1', name: 'Pass 1', price: 10, description: 'Test' };
      const pass2: Pass = { id: '2', name: 'Pass 2', price: 15, description: 'Test' };
      const items: CartItem[] = [
        { id: '1', pass: pass1, quantity: 2 },
        { id: '2', pass: pass2, quantity: 1 }
      ];
      expect(calculateCartTotal(items)).toBe(35);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0);
    });
  });

  describe('addToCart', () => {
    it('should return false when Supabase is not configured', async () => {
      const { isSupabaseConfigured } = await import('../supabase');
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      
      const result = await addToCart('pass-id');
      expect(result).toBe(false);
    });
  });

  describe('getCartItems', () => {
    it('should return empty array when Supabase is not configured', async () => {
      const { isSupabaseConfigured } = await import('../supabase');
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      
      const result = await getCartItems();
      expect(result).toEqual([]);
    });
  });
});