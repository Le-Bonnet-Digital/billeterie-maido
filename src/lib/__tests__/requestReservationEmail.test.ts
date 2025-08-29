import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase';
import { requestReservationEmail } from '../requestReservationEmail';

describe('requestReservationEmail', () => {
  it('should return data on successful request', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { found: true, sent: true },
      error: null,
    });

    await expect(
      requestReservationEmail({ email: 'test@example.com' })
    ).resolves.toEqual({ found: true, sent: true });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('request-reservation-email', {
      body: { email: 'test@example.com' },
    });
  });

  it('should return null on failure', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'fail' },
    });

    await expect(
      requestReservationEmail({ email: 'test@example.com' })
    ).resolves.toBeNull();
  });
});

