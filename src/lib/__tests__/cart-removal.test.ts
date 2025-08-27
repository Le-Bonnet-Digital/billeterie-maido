import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../notifications', () => ({
  toastNotify: vi.fn(),
}));

import * as cart from '../cart';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { toastNotify } from '../notifications';

const { removeFromCart, clearCart } = cart;

describe('Cart removal operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('removeFromCart', () => {
    it('should remove item successfully', async () => {
      const eq = vi.fn().mockResolvedValue({ error: null });
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await removeFromCart('item-id');

      expect(result).toBe(true);
      expect(toastNotify).toHaveBeenCalledWith('success', 'Article supprimé du panier');
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle supabase error', async () => {
      const eq = vi.fn().mockResolvedValue({ error: { message: 'db error' } });
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await removeFromCart('item-id');

      expect(result).toBe(false);
      expect(toastNotify).toHaveBeenCalledWith('error', 'Erreur lors de la suppression');
      expect(logger.error).toHaveBeenCalledWith('Erreur suppression panier', expect.any(Object));
    });

    it('should handle exception', async () => {
      const eq = vi.fn().mockRejectedValue(new Error('fail'));
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await removeFromCart('item-id');

      expect(result).toBe(false);
      expect(toastNotify).toHaveBeenCalledWith('error', 'Une erreur est survenue');
      expect(logger.error).toHaveBeenCalledWith('Erreur removeFromCart', expect.any(Object));
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      vi.spyOn(cart, 'getSessionId').mockReturnValue('session-123');
      const eq = vi.fn().mockResolvedValue({ error: null });
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await clearCart();

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle supabase error', async () => {
      vi.spyOn(cart, 'getSessionId').mockReturnValue('session-123');
      const eq = vi.fn().mockResolvedValue({ error: { message: 'db error' } });
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await clearCart();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Erreur vidage panier', expect.any(Object));
    });

    it('should handle exception', async () => {
      vi.spyOn(cart, 'getSessionId').mockReturnValue('session-123');
      const eq = vi.fn().mockRejectedValue(new Error('fail'));
      const del = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ delete: del });

      const result = await clearCart();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Erreur clearCart', { error: expect.any(Error) });
    });
  });
});

