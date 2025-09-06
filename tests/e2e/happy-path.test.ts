/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from 'vitest';

const reservations: any[] = [];
const stripeSessions: any[] = [];
const validations: any[] = [];
const emails: any[] = [];

const state = {
  from: (table: string) => ({}) as any,
  invoke: async (_name: string, args: any) => ({
    data: { sent: true },
    error: null,
  }),
};

const stripeState = { constructEvent: vi.fn() };
let handler: (req: Request) => Promise<Response>;

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => state.from(table),
    functions: {
      invoke: (name: string, args: any) => state.invoke(name, args),
    },
  },
}));

vi.mock('../../src/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 'prov-1',
    email: 'p@test.com',
    role: 'provider',
  })),
}));

state.from = (table: string) => {
  if (table === 'stripe_sessions')
    return {
      insert: async (row: any) => {
        if (stripeSessions.find((s) => s.id === row.id))
          return { error: { code: '23505' } };
        stripeSessions.push(row);
        return { error: null };
      },
    };
  if (table === 'reservations')
    return {
      insert: (row: any) => ({
        select: () => ({
          single: async () => {
            const id = `res-${reservations.length + 1}`;
            const rec = {
              ...row,
              id,
              reservation_number: `RES-2025-001-${String(
                reservations.length + 1,
              ).padStart(4, '0')}`,
            };
            reservations.push(rec);
            return { data: { id }, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (_c: string, val: string) => ({
          single: async () => {
            const r = reservations.find((r) => r.reservation_number === val);
            return r ? { data: r, error: null } : { data: null, error: {} };
          },
        }),
      }),
    };
  if (table === 'reservation_validations')
    return {
      select: () => ({
        eq: (_c: string, val: string) => ({
          eq: (_c2: string, val2: string) => ({
            limit: () =>
              Promise.resolve({
                data: validations
                  .filter(
                    (v) => v.reservation_id === val && v.activity === val2,
                  )
                  .slice(0, 1),
                error: null,
              }),
          }),
        }),
      }),
      insert: async (row: any) => {
        validations.push(row);
        return { error: null };
      },
    };
  return {} as any;
};

state.invoke = async (_name: string, args: any) => {
  emails.push(args.body);
  return { data: { sent: true }, error: null };
};

import { validateReservation } from '../../src/lib/validation';

describe.skip('E2E happy path', () => {
  it('completes purchase and validation', async () => {
    vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
      serve: (cb: (req: Request) => Promise<Response>) => {
        handler = cb;
      },
    }));

    vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
      createClient: () => ({
        from: state.from,
        functions: {
          invoke: (name: string, args: any) => state.invoke(name, args),
        },
      }),
    }));

    vi.mock('https://esm.sh/stripe@13?target=deno', () => ({
      default: vi.fn(() => ({
        webhooks: { constructEvent: stripeState.constructEvent },
      })),
    }));

    stripeState.constructEvent.mockReturnValue({
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

    process.env.STRIPE_SECRET = 'sk';
    process.env.SUPABASE_URL = 'url';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    process.env.WEBHOOK_SECRET = 'wh';
    (globalThis as any).Deno = {
      env: { get: (name: string) => process.env[name] },
    };

    await import('../../supabase/functions/stripe-webhook/index.ts');

    await handler(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'Stripe-Signature': 'sig' },
        body: '{}',
      }),
    );

    expect(reservations).toHaveLength(1);
    expect(emails[0]).toEqual({ email: 'a@b.c', reservationId: 'res-1' });

    const first = await validateReservation(
      'RES-2025-001-0001',
      'luge_bracelet',
    );
    expect(first).toEqual({ ok: true, reservationId: 'res-1' });

    const second = await validateReservation(
      'RES-2025-001-0001',
      'luge_bracelet',
    );
    expect(second).toEqual({ ok: false, reason: 'Déjà validé' });
  });
});
