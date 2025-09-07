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

  it('returns structured payload for invalid code format', async () => {
    const res = await validateReservation('BAD CODE', 'poney');
    expect(res).toEqual({
      reservation: {
        id: null,
        number: null,
        client_email: null,
        payment_status: null,
        created_at: null,
        pass: null,
        activity_expected: null,
        time_slot: null,
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
    });
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
          reservation_number: 'RES-2025-001-0001',
          client_email: 'c@example.com',
          payment_status: 'paid',
          created_at: '2025-01-01T09:00:00.000Z',
          pass: { id: 'pass-1', name: 'Pass Poney' },
          event_activities: { activities: { name: 'poney' } },
          time_slots: {
            id: 'slot-1',
            slot_time: '2025-01-02T10:00:00.000Z',
          },
        },
        error: null,
      }),
    };

    const validationsQuery = {
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    const insertBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          validated_at: '2025-01-01T10:00:00.000Z',
          validated_by: 'agent-1',
        },
        error: null,
      }),
    };

    const validationsTable = {
      select: vi.fn().mockReturnValue(validationsQuery),
      insert: vi.fn().mockReturnValue(insertBuilder),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { email: 'agent1@example.com' },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reservations') return reservationsBuilder as never;
      if (table === 'reservation_validations') return validationsTable as never;
      if (table === 'users') return usersBuilder as never;
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
        time_slot: {
          id: 'slot-1',
          slot_time: '2025-01-02T10:00:00.000Z',
        },
      },
      requested_activity: 'poney',
      history: [
        {
          validated_at: '2025-01-01T10:00:00.000Z',
          validated_by: 'agent-1',
          validated_by_email: 'agent1@example.com',
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
    });
    expect(validationsTable.insert).toHaveBeenCalledWith({
      reservation_id: 'res-1',
      activity: 'poney',
      validated_by: 'agent-1',
    });
  });

  it('returns alreadyValidated info without reinserting', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'agent-1' } as {
      id: string;
    });

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
          event_activities: { activities: { name: 'poney' } },
        },
        error: null,
      }),
    };

    const validationsQuery = {
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) =>
        resolve({
          data: [
            {
              validated_at: '2025-01-01T10:00:00.000Z',
              validated_by: 'agent-2',
            },
          ],
          error: null,
        }),
      ),
    };

    const validationsTable = {
      select: vi.fn().mockReturnValue(validationsQuery),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    const usersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { email: 'agent2@example.com' },
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reservations') return reservationsBuilder as never;
      if (table === 'reservation_validations') return validationsTable as never;
      if (table === 'users') return usersBuilder as never;
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
        pass: null,
        activity_expected: 'poney',
        time_slot: null,
      },
      requested_activity: 'poney',
      history: [
        {
          validated_at: '2025-01-01T10:00:00.000Z',
          validated_by: 'agent-2',
          validated_by_email: 'agent2@example.com',
        },
      ],
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: true,
        validated: false,
      },
    });
    expect(validationsTable.insert).not.toHaveBeenCalled();
  });

  it('rejects reservation not matching activity', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'agent-1' } as {
      id: string;
    });

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
          event_activities: { activities: { name: 'tir_arc' } },
        },
        error: null,
      }),
    };

    const validationsQuery = {
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    const validationsTable = {
      select: vi.fn().mockReturnValue(validationsQuery),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'reservations') return reservationsBuilder as never;
      if (table === 'reservation_validations') return validationsTable as never;
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
        pass: null,
        activity_expected: 'tir_arc',
        time_slot: null,
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
    });
    expect(validationsTable.insert).not.toHaveBeenCalled();
  });
});
