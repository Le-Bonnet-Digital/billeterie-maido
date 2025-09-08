import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  getSessionId,
  addToCart,
  getCartItems,
  removeFromCart,
  clearCart,
  calculateCartTotal,
  validateStock,
  updateExistingItem,
  insertNewItem,
  notifyUser,
} from '../cart';
import type { CartItem, Pass } from '../cart';
import type { CartRepository } from '../cartRepository';
import { safeStorage } from '../storage';
import { logger } from '../logger';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'test-session-id' },
});

function createRepo(overrides: Partial<CartRepository> = {}): CartRepository {
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    getPassRemainingStock: vi.fn().mockResolvedValue(10),
    getEventActivityRemainingStock: vi.fn().mockResolvedValue(10),
    getSlotRemainingCapacity: vi.fn().mockResolvedValue(10),
    cleanupExpiredCartItems: vi.fn().mockResolvedValue(undefined),
    findCartItem: vi.fn().mockResolvedValue(null),
    updateCartItem: vi.fn().mockResolvedValue(true),
    insertCartItem: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as CartRepository;
}

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
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cart_session_id',
        'test-session-id',
      );
    });

    it('should fall back to memory when localStorage is unavailable', () => {
      safeStorage.removeItem('cart_session_id');
      const original = window.localStorage;
      delete (window as unknown as { localStorage?: Storage }).localStorage;

      const sessionId1 = getSessionId();
      const sessionId2 = getSessionId();
      expect(sessionId1).toBe('test-session-id');
      expect(sessionId2).toBe('test-session-id');

      Object.defineProperty(window, 'localStorage', {
        value: original,
        configurable: true,
      });
    });
  });

  describe('calculateCartTotal', () => {
    it('should calculate total correctly', () => {
      const pass1: Pass = {
        id: '1',
        name: 'Pass 1',
        price: 10,
        description: 'Test',
      };
      const pass2: Pass = {
        id: '2',
        name: 'Pass 2',
        price: 15,
        description: 'Test',
      };
      const items: CartItem[] = [
        { id: '1', pass: pass1, quantity: 2 },
        { id: '2', pass: pass2, quantity: 1 },
      ];
      expect(calculateCartTotal(items)).toBe(35);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0);
    });
  });

  describe('addToCart', () => {
    it('should return false when repository is not configured', async () => {
      const repo = createRepo({ isConfigured: vi.fn().mockReturnValue(false) });
      const notify = vi.fn();
      const result = await addToCart('pass-id', [], 1, repo, notify);
      expect(result).toBe(false);
      expect(notify).toHaveBeenCalledWith(
        'error',
        'Configuration requise. Veuillez connecter Supabase.',
      );
    });

    it('should add item to cart when repository is configured', async () => {
      const repo = createRepo();
      const notify = vi.fn();
      mockLocalStorage.getItem.mockReturnValue('session-123');

      const result = await addToCart('pass-id', [], 1, repo, notify);
      expect(result).toBe(true);
      expect(repo.insertCartItem).toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(
        'success',
        'Article ajouté au panier',
      );
    });

    it('should return false for invalid quantity', async () => {
      const repo = createRepo();
      const notify = vi.fn();
      const result = await addToCart('pass-id', [], 0, repo, notify);
      expect(result).toBe(false);
      expect(notify).toHaveBeenCalledWith(
        'error',
        'La quantité doit être un entier positif',
      );
    });

    it('should handle repository errors gracefully', async () => {
      const repo = createRepo({
        insertCartItem: vi.fn().mockRejectedValue(new Error('fail')),
      });
      const notify = vi.fn();
      const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const result = await addToCart('pass-id', [], 1, repo, notify);
      expect(result).toBe(false);
      expect(notify).toHaveBeenCalledWith('error', 'Une erreur est survenue');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('validateStock', () => {
    it('should return null when stock is sufficient', async () => {
      const repo = createRepo();
      const result = await validateStock(repo, 'pass', [], 1);
      expect(result).toBeNull();
    });

    it('should return error message when stock is insufficient', async () => {
      const repo = createRepo({
        getPassRemainingStock: vi.fn().mockResolvedValue(0),
      });
      const result = await validateStock(repo, 'pass', [], 1);
      expect(result).toBe('Stock insuffisant pour ce pass');
    });
  });

  describe('updateExistingItem', () => {
    it('should update quantity using repository', async () => {
      const updateCartItem = vi.fn().mockResolvedValue(true);
      const repo = createRepo({ updateCartItem });
      const success = await updateExistingItem(
        repo,
        { id: '1', quantity: 2 },
        1,
      );
      expect(success).toBe(true);
      expect(updateCartItem).toHaveBeenCalledWith('1', 3);
    });
  });

  describe('insertNewItem', () => {
    it('should insert item using repository', async () => {
      const insertCartItem = vi.fn().mockResolvedValue(true);
      const repo = createRepo({ insertCartItem });
      const success = await insertNewItem(repo, 'sess', 'pass', [], 1);
      expect(success).toBe(true);
      expect(insertCartItem).toHaveBeenCalledWith(
        'sess',
        'pass',
        [],
        1,
        undefined,
        undefined,
      );
    });
  });

  describe('notifyUser', () => {
    it('should call notify function with given message', () => {
      const notify = vi.fn();
      notifyUser(notify, 'success', 'ok');
      expect(notify).toHaveBeenCalledWith('success', 'ok');
    });
  });

  describe('getCartItems', () => {
    it('should return empty array when Supabase is not configured', async () => {
      const { isSupabaseConfigured } = await import('../supabase');
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);

      const result = await getCartItems();
      expect(result).toEqual([]);
    });

    it('should include event activity and time slot when present', async () => {
      const { supabase, isSupabaseConfigured } = await import('../supabase');
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      const builderCartItems = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'ci1',
              quantity: 1,
              pass_id: 'p1',
              product_type: 'event_pass',
              product_id: null,
            },
          ],
          error: null,
        }),
      };
      const builderPasses = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'p1', name: 'Pass', price: 10, description: 'Desc' }],
        }),
      };
      const builderActivities = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              cart_item_id: 'ci1',
              event_activity_id: 'ea1',
              time_slot_id: 'ts1',
              event_activities: {
                id: 'ea1',
                activities: { id: 'a1', name: 'Act', icon: '🎯' },
              },
            },
          ],
        }),
      };
      const builderSlots = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'ts1', slot_time: '2025-09-06T10:00:00.000Z' }],
        }),
      };

      (supabase.from as unknown as Mock)
        .mockReturnValueOnce(builderCartItems as unknown)
        .mockReturnValueOnce(builderPasses as unknown)
        .mockReturnValueOnce(builderActivities as unknown)
        .mockReturnValueOnce(builderSlots as unknown);

      const items = await getCartItems();
      expect(items).toHaveLength(1);
      expect(items[0].eventActivity?.id).toBe('ea1');
      expect(items[0].timeSlot?.id).toBe('ts1');
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
      vi.mocked(supabase.from).mockReturnValue(
        builder as unknown as ReturnType<typeof supabase.from>,
      );

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
      vi.mocked(supabase.from).mockReturnValue(
        builder as unknown as ReturnType<typeof supabase.from>,
      );
      mockLocalStorage.getItem.mockReturnValue('session-123');

      const result = await clearCart();
      expect(result).toBe(true);
    });
  });
});
