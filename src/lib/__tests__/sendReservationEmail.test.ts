import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase';
import { sendReservationEmail } from '../sendReservationEmail';

describe('sendReservationEmail', () => {
  it('should resolve on successful email sending', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: {}, error: null });

    await expect(
      sendReservationEmail({ email: 'test@example.com', reservationId: '1' })
    ).resolves.toBeUndefined();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-reservation-email', {
      body: { email: 'test@example.com', reservationId: '1' },
    });
  });

  it('should throw on email sending failure', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'fail' } });

    await expect(
      sendReservationEmail({ email: 'test@example.com', reservationId: '1' })
    ).rejects.toThrow('fail');
  });
});

