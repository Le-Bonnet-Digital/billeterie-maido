import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (req: Request) => Promise<Response>;

const limitMock = vi.fn();
const fromMock = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: limitMock,
};

const invokeMock = vi.fn();
const clientMock = {
  from: vi.fn(() => fromMock),
  functions: { invoke: invokeMock },
};

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => clientMock),
}));

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: (cb: (req: Request) => Promise<Response>) => {
    handler = cb;
  },
}));

describe('request-reservation-email edge function', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    interface DenoEnv {
      get(name: string): string | undefined;
    }
    interface DenoGlobal {
      env: DenoEnv;
    }
    (globalThis as unknown as { Deno: DenoGlobal }).Deno = {
      env: {
        get: (name: string) => process.env[name],
      },
    };
    limitMock.mockResolvedValue({ data: [], error: null });
    invokeMock.mockResolvedValue({ data: null, error: null });

    await import('./index.ts');
  });

  it('returns 400 for invalid email', async () => {
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid' }),
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid email' });
  });

  it('returns 200 with found false when reservation is missing', async () => {
    limitMock.mockResolvedValue({ data: [], error: null });
    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'valid@example.com' }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ found: false });
  });

  it('returns 200 with found true when reservation exists and email is sent', async () => {
    limitMock.mockResolvedValue({
      data: [{ id: '1', created_at: '' }],
      error: null,
    });
    invokeMock.mockResolvedValue({ error: null });

    const res = await handler(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'valid@example.com' }),
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ found: true, sent: true });
    expect(invokeMock).toHaveBeenCalledWith('send-reservation-email', {
      body: { email: 'valid@example.com', reservationId: '1' },
      headers: { Authorization: 'Bearer service-key' },
    });
  });
});
