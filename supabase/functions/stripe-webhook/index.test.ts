import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (req: Request) => Promise<Response>;

const insertSessionMock = vi.fn();
const insertReservationMock = vi.fn();
const fromMock = vi.fn((table: string) =>
  table === 'stripe_sessions'
    ? { insert: insertSessionMock }
    : { insert: insertReservationMock },
);
const supabaseClient = { from: fromMock };

const constructEventMock = vi.fn();
const stripeMock = { webhooks: { constructEvent: constructEventMock } };

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => supabaseClient),
}));

vi.mock('https://esm.sh/stripe@13?target=deno', () => ({
  default: vi.fn(() => stripeMock),
}));

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: (cb: (req: Request) => Promise<Response>) => {
    handler = cb;
  },
}));

describe('stripe-webhook edge function', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET = 'sk_test';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.WEBHOOK_SECRET = 'whsec';
    (
      globalThis as unknown as {
        Deno: { env: { get: (name: string) => string | undefined } };
      }
    ).Deno = {
      env: { get: (name: string) => process.env[name] },
    };
  });

  it('returns 400 on invalid signature', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('bad signature');
    });
    await import('./index.ts');
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Stripe-Signature': 'sig' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('inserts reservations on checkout completion', async () => {
    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_1',
          metadata: {
            cart: JSON.stringify([{ pass: { id: '1' }, quantity: 1 }]),
            customer: JSON.stringify({ email: 'a@b.c' }),
          },
        },
      },
    });
    insertSessionMock.mockResolvedValue({ error: null });
    insertReservationMock.mockResolvedValue({ error: null });
    await import('./index.ts');
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Stripe-Signature': 'sig' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertSessionMock).toHaveBeenCalled();
    expect(insertReservationMock).toHaveBeenCalled();
  });

  it('skips processing when session already handled', async () => {
    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_1',
          metadata: {
            cart: JSON.stringify([{ pass: { id: '1' }, quantity: 1 }]),
            customer: JSON.stringify({ email: 'a@b.c' }),
          },
        },
      },
    });
    insertSessionMock.mockResolvedValue({ error: { code: '23505' } });
    await import('./index.ts');
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Stripe-Signature': 'sig' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertReservationMock).not.toHaveBeenCalled();
  });
});
