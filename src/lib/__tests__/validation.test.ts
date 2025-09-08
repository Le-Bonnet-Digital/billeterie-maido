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
import type { User } from '../auth';

/* ------------------------ Helpers de test typés ------------------------ */

type TableName = 'reservations' | 'reservation_validations' | 'users';

/**
 * Adapte notre implémentation typée (TableName) => unknown
 * à la signature attendue par Vitest: (...args: unknown[]) => unknown
 * (sans utiliser `any`)
 */
function setSupabaseFromMock(impl: (table: TableName) => unknown) {
  const mocked = vi.mocked(supabase.from) as unknown as {
    mockImplementation: (fn: (...args: unknown[]) => unknown) => unknown;
  };

  mocked.mockImplementation((...args: unknown[]) => {
    const [table] = args;
    return impl(table as TableName);
  });
}

/* ---------------------------- Utilisateur factice ---------------------------- */

const fakeUser: User = {
  id: 'agent-1',
  email: 'agent1@example.com',
  role: 'agent' as User['role'],
};

/* ---------------------------------- Tests ---------------------------------- */

describe('validateReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns structured payload for invalid code format', async () => {
    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const validationsTable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'agent-1',
          email: 'agent1@example.com',
          role: 'agent',
        },
        error: null,
      }),
    };

    setSupabaseFromMock((table) => {
      if (table === 'reservations') return reservationsBuilder;
      if (table === 'reservation_validations') return validationsTable;
      if (table === 'users') return usersBuilder;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-2025-001-0001', 'poney');
    expect(res).toEqual({
      reservation: {
        id: 'res-1',
        number: 'RES-2025-001-0001',
        client_email: 'c@example.com',
        payment_status: 'paid',
        created_at: '2025-01-01T09:00:00.000Z',
        pass: { id: 'pass-1', name: 'Pass Poney' },
        activity_expected: 'poney',
        time_slot: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
      },
      requested_activity: 'poney',
      history: [],
      status: {
        invalid: true,
        notFound: true,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Code invalide',
      meta: undefined,
    });
  });

  it('returns success for first validation', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);

    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'res-1',
          reservation_number: 'RES-2025-001-0001',
          client_email: 'c@example.com',
          payment_status: 'paid',
          created_at: '2025-01-01T09:00:00.000Z',
          pass: { id: 'pass-1', name: 'Pass Poney' },
          event_activity_id: 'ea-1',
          event_activities: { activities: { name: 'poney' } },
          time_slots: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
        },
        error: null,
      }),
    };

    const validationsTable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'agent-1',
          email: 'agent1@example.com',
          role: 'agent',
        },
        error: null,
      }),
    };

    setSupabaseFromMock((table) => {
      if (table === 'reservations') return reservationsBuilder;
      if (table === 'reservation_validations') return validationsTable;
      if (table === 'users') return usersBuilder;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-2025-001-0001', 'poney');

    expect(res).toEqual({
      reservation: {
        id: 'res-1',
        number: 'RES-2025-001-0001',
        client_email: 'c@example.com',
        payment_status: 'paid',
        created_at: '2025-01-01T09:00:00.000Z',
        pass: { id: 'pass-1', name: 'Pass Poney' },
        activity_expected: 'poney',
        time_slot: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
      },
      requested_activity: 'poney',
      history: [],
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: true,
      },
      ok: true,
      reason: undefined,
      meta: undefined,
    });

    expect(validationsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reservation_id: 'res-1',
        agent_id: 'agent-1',
        status: 'validated',
      }),
    );
  });

  it('returns alreadyValidated info without reinserting', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);

    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'res-1',
          reservation_number: 'RES-2025-001-0001',
          client_email: 'c@example.com',
          payment_status: 'paid',
          created_at: '2025-01-01T09:00:00.000Z',
          pass: { id: 'pass-1', name: 'Pass Poney' },
          event_activity_id: 'ea-1',
          event_activities: { activities: { name: 'poney' } },
          time_slots: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
        },
        error: null,
      }),
    };

    const validationsTable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'v1',
            reservation_id: 'res-1',
            agent_id: 'agent-1',
            created_at: '2025-01-02T10:05:00.000Z',
            status: 'validated',
          },
        ],
        error: null,
      }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'agent-1',
          email: 'agent1@example.com',
          role: 'agent',
        },
        error: null,
      }),
    };

    setSupabaseFromMock((table) => {
      if (table === 'reservations') return reservationsBuilder;
      if (table === 'reservation_validations') return validationsTable;
      if (table === 'users') return usersBuilder;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-2025-001-0001', 'poney');

    expect(res).toEqual({
      reservation: {
        id: 'res-1',
        number: 'RES-2025-001-0001',
        client_email: 'c@example.com',
        payment_status: 'paid',
        created_at: '2025-01-01T09:00:00.000Z',
        pass: { id: 'pass-1', name: 'Pass Poney' },
        activity_expected: 'poney',
        time_slot: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
      },
      requested_activity: 'poney',
      history: [
        {
          id: 'v1',
          reservation_id: 'res-1',
          agent_id: 'agent-1',
          created_at: '2025-01-02T10:05:00.000Z',
          status: 'validated',
        },
      ],
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: true,
        validated: true,
      },
      ok: true,
      reason: 'Réservation déjà validée',
      meta: undefined,
    });

    expect(validationsTable.insert).not.toHaveBeenCalled();
  });

  it('allows re-validation after a revoked validation', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);

    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'res-1',
          reservation_number: 'RES-2025-001-0001',
          client_email: 'c@example.com',
          payment_status: 'paid',
          created_at: '2025-01-01T09:00:00.000Z',
          pass: { id: 'pass-1', name: 'Pass Poney' },
          event_activity_id: 'ea-1',
          event_activities: { activities: { name: 'poney' } },
          time_slots: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
        },
        error: null,
      }),
    };

    const validationsTable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'v1',
            reservation_id: 'res-1',
            agent_id: 'agent-1',
            created_at: '2025-01-02T10:05:00.000Z',
            status: 'revoked',
          },
        ],
        error: null,
      }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'agent-1',
          email: 'agent1@example.com',
          role: 'agent',
        },
        error: null,
      }),
    };

    setSupabaseFromMock((table) => {
      if (table === 'reservations') return reservationsBuilder;
      if (table === 'reservation_validations') return validationsTable;
      if (table === 'users') return usersBuilder;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-2025-001-0001', 'poney');

    expect(res).toEqual({
      reservation: {
        id: 'res-1',
        number: 'RES-2025-001-0001',
        client_email: 'c@example.com',
        payment_status: 'paid',
        created_at: '2025-01-01T09:00:00.000Z',
        pass: { id: 'pass-1', name: 'Pass Poney' },
        activity_expected: 'poney',
        time_slot: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
      },
      requested_activity: 'poney',
      history: [
        {
          id: 'v1',
          reservation_id: 'res-1',
          agent_id: 'agent-1',
          created_at: '2025-01-02T10:05:00.000Z',
          status: 'revoked',
        },
      ],
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: true,
      },
      ok: true,
      reason: undefined,
      meta: undefined,
    });

    expect(validationsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reservation_id: 'res-1',
        agent_id: 'agent-1',
        status: 'validated',
      }),
    );
  });

  it('rejects reservation not matching activity', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(fakeUser);

    const reservationsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'res-1',
          reservation_number: 'RES-2025-001-0001',
          client_email: 'c@example.com',
          payment_status: 'paid',
          created_at: '2025-01-01T09:00:00.000Z',
          pass: { id: 'pass-1', name: 'Pass Poney' },
          event_activity_id: 'ea-1',
          event_activities: { activities: { name: 'tir_arc' } },
          time_slots: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
        },
        error: null,
      }),
    };

    const validationsTable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'agent-1',
          email: 'agent1@example.com',
          role: 'agent',
        },
        error: null,
      }),
    };

    setSupabaseFromMock((table) => {
      if (table === 'reservations') return reservationsBuilder;
      if (table === 'reservation_validations') return validationsTable;
      if (table === 'users') return usersBuilder;
      throw new Error('unknown table ' + table);
    });

    const res = await validateReservation('RES-2025-001-0001', 'poney');

    expect(res).toEqual({
      reservation: {
        id: 'res-1',
        number: 'RES-2025-001-0001',
        client_email: 'c@example.com',
        payment_status: 'paid',
        created_at: '2025-01-01T09:00:00.000Z',
        pass: { id: 'pass-1', name: 'Pass Poney' },
        activity_expected: 'tir_arc',
        time_slot: { id: 'slot-1', slot_time: '2025-01-02T10:00:00.000Z' },
      },
      requested_activity: 'poney',
      history: [],
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: true,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Réservation invalide pour cette activité',
      meta: { reservedActivity: 'tir_arc', requested: 'poney' },
    });
    expect(validationsTable.insert).not.toHaveBeenCalled();
  });
});
