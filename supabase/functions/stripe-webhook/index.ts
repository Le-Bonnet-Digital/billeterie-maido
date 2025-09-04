/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'https://esm.sh/stripe@13?target=deno';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function getEnvOptional(name: string): string | undefined {
  return Deno.env.get(name);
}

async function alertError(message: string) {
  console.error(message);
  const webhook = getEnvOptional('ALERT_WEBHOOK_URL');
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    } catch (err) {
      console.error('Alert webhook failed', err);
    }
  }
}

const stripe = new Stripe(getEnv('STRIPE_SECRET'), {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY'),
);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  const signature = req.headers.get('Stripe-Signature') ?? '';
  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getEnv('WEBHOOK_SECRET'),
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
    });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    try {
      const { error: sessionError } = await supabase
        .from('stripe_sessions')
        .insert({ id: session.id });
      if (sessionError) {
        if ((sessionError as { code?: string }).code === '23505') {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        }
        throw sessionError;
      }

      const cartItems = JSON.parse(session.metadata?.cart ?? '[]') as Array<{
        pass: { id: string };
        eventActivity?: { id: string };
        timeSlot?: { id: string };
        quantity: number;
      }>;
      const customer = JSON.parse(session.metadata?.customer ?? '{}') as {
        email?: string;
      };

      for (const item of cartItems) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          const { error } = await supabase.from('reservations').insert({
            client_email: customer.email,
            pass_id: item.pass.id,
            event_activity_id: item.eventActivity?.id ?? null,
            time_slot_id: item.timeSlot?.id ?? null,
            payment_status: 'paid',
          });
          if (error) throw error;
        }
      }

    } catch (err) {
      await alertError((err as Error).message);
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
