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

    it('should add item to cart when Supabase is configured', async () => {
      const { supabase } = await import('../supabase');
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as any);
      mockLocalStorage.getItem.mockReturnValue('session-123');

      const result = await addToCart('pass-id');
      expect(result).toBe(true);
      expect(builder.insert).toHaveBeenCalled();
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

  describe('removeFromCart', () => {
    it('should remove item successfully', async () => {
      const { supabase } = await import('../supabase');
      const builder = {
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as any);

      const result = await removeFromCart('item-id');
      expect(result).toBe(true);
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      const { supabase } = await import('../supabase');
      const builder = {
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as any);
      mockLocalStorage.getItem.mockReturnValue('session-123');

      const result = await clearCart();
      expect(result).toBe(true);
    });
  });
});