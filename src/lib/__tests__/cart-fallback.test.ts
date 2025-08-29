import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../storage', () => ({
  safeStorage: {
    getItem: vi.fn().mockReturnValue('sess-1'),
    setItem: vi.fn(),
  },
}));

import { supabase } from '../supabase';
import { getCartItems } from '../cart';

describe('getCartItems fallback select', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries without attendee columns when DB is not migrated', async () => {
    const builder1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: null, error: { code: '42703', message: 'column cart_items.attendee_first_name does not exist' } }),
    };
    const builder2 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    (supabase.from as unknown as Mock)
      .mockReturnValueOnce(builder1 as unknown)
      .mockReturnValueOnce(builder2 as unknown);

    const items = await getCartItems();
    expect(items).toEqual([]);
    expect((supabase.from as unknown as Mock)).toHaveBeenCalledTimes(2);
    expect(builder1.select).toHaveBeenCalled();
    expect(builder2.select).toHaveBeenCalled();
  });
});
