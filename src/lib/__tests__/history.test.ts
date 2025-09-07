import { describe, it, expect, vi } from 'vitest';
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('../logger', () => ({ debugLog: vi.fn() }));

import { fetchValidationHistory, exportValidationHistoryCSV } from '../history';
import { supabase } from '../supabase';
import { getCurrentUser } from '../auth';
import { debugLog } from '../logger';

describe('history utils', () => {
  it('fetches history with filters', async () => {
    const rows = [
      {
        id: 'val-1',
        validated_at: '2025-01-01T10:00:00Z',
        activity: 'poney',
        reservations: {
          reservation_number: 'RES-1',
          client_email: 'client@example.com',
          payment_status: 'paid',
          pass: { name: 'Pass Poney' },
        },
        agent: { email: 'agent@example.com' },
      },
    ];

    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: rows, error: null, count: 1 })),
    };

    const user = { id: 'user-1' };
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(debugLog).mockImplementation(() => {});
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await fetchValidationHistory({
      startDate: '2025-01-01',
      activities: ['poney'],
      search: 'RES-1',
      limit: 10,
      offset: 0,
    });

    expect(builder.gte).toHaveBeenCalledWith('validated_at', '2025-01-01');
    expect(builder.in).toHaveBeenCalledWith('activity', ['poney']);
    expect(builder.or).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 'val-1',
        validated_at: '2025-01-01T10:00:00Z',
        reservation_number: 'RES-1',
        client_email: 'client@example.com',
        pass_name: 'Pass Poney',
        activity: 'poney',
        agent_email: 'agent@example.com',
        payment_status: 'paid',
      },
    ]);
  });

  it('exports csv', () => {
    const csv = exportValidationHistoryCSV([
      {
        id: '1',
        validated_at: '2025-01-01',
        reservation_number: 'RES-1',
        client_email: 'c@example.com',
        pass_name: 'Pass',
        activity: 'poney',
        agent_email: 'a@example.com',
        payment_status: 'paid',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('validated_at');
    expect(lines[1]).toContain('RES-1');
  });
});
