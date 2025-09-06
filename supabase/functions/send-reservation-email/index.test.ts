import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (req: Request) => Promise<Response>;

const singleMock = vi.fn();
const fromMock = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: singleMock,
};

const clientMock = { from: vi.fn(() => fromMock) };
const fetchMock = vi.fn();

const qrMock = vi.fn().mockResolvedValue('data:qr');

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => clientMock),
}));

vi.mock('https://esm.sh/qrcode@1?target=deno', () => ({
  toDataURL: qrMock,
}));

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: (cb: (req: Request) => Promise<Response>) => {
    handler = cb;
  },
}));

describe.skip('send-reservation-email edge function', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.FROM_EMAIL = 'from@example.com';
    (
      globalThis as unknown as {
        Deno: { env: { get: (name: string) => string | undefined } };
      }
    ).Deno = {
      env: { get: (name: string) => process.env[name] },
    };
    singleMock.mockResolvedValue({
      data: {
        id: '1',
        reservation_number: 'ABC',
        client_email: 'valid@example.com',
      },
      error: null,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn(),
    } as unknown as Response);
    await import('./index.ts');
  });

  it('returns 400 for invalid request', async () => {
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid', reservationId: '1' }),
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid request' });
  });

  it('returns 404 when reservation not found', async () => {
    singleMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'not found' },
    });
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          email: 'valid@example.com',
          reservationId: '1',
        }),
      }),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: 'Reservation not found',
    });
  });

  it('sends email when reservation exists', async () => {
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          email: 'valid@example.com',
          reservationId: '1',
        }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('data:qr'),
      }),
    );
    expect(qrMock).toHaveBeenCalledWith('ABC');
  });
});
