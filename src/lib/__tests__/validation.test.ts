import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateReservation } from '../validation';

vi.mock('../supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { supabase } from '../supabase';
import { getCurrentUser } from '../auth';

describe('validateReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid code format', async () => {
    const res = await validateReservation('BAD CODE', 'poney');
    expect(res).toEqual({ ok: false, reason: 'Format de code invalide' });
  });

  it('returns success for first validation', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'agent-1' } as {
      id: string;
    });

    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'res-1',
          reservation_number: 'RES-1',
          payment_status: 'paid',
        },
        error: null,
      }),
    };

    const validationsQuery = {
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const validationsTable = {
      select: vi.fn().mockReturnValue(validationsQuery),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reservations') return reservationsBuilder as never;
      if (table === 'reservation_validations') return validationsTable as never;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-1', 'poney');
    expect(res).toEqual({ ok: true, reservationId: 'res-1' });
    expect(validationsTable.insert).toHaveBeenCalledWith({
      reservation_id: 'res-1',
      activity: 'poney',
      validated_by: 'agent-1',
    });
  });
});
