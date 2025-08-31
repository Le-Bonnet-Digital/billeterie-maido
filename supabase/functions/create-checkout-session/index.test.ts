import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (req: Request) => Promise<Response>;

const createSessionMock = vi.fn();
const stripeMock = { checkout: { sessions: { create: createSessionMock } } };

vi.mock('https://esm.sh/stripe@13?target=deno', () => ({
  default: vi.fn(() => stripeMock),
}));

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: (cb: (req: Request) => Promise<Response>) => {
    handler = cb;
  },
}));

describe('create-checkout-session edge function', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET = 'sk_test';
    (
      globalThis as unknown as {
        Deno: { env: { get: (n: string) => string | undefined } };
      }
    ).Deno = {
      env: { get: (name: string) => process.env[name] },
    };
    createSessionMock.mockResolvedValue({ url: 'https://stripe.test/session' });
    await import('./index.ts');
  });

  it('returns 405 for non POST', async () => {
    const res = await handler(new Request('http://localhost')); // GET by default
    expect(res.status).toBe(405);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await handler(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
    );
    expect(res.status).toBe(400);
  });

  it('creates session and returns url', async () => {
    const body = {
      cartItems: [{ pass: { id: '1', name: 'Test', price: 10 }, quantity: 1 }],
      customer: { email: 'test@example.com' },
    };
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      url: 'https://stripe.test/session',
    });
  });
});
