// Edge Function (Deno) — Stripe webhook → création de réservations + envoi d'email

import Stripe from 'npm:stripe@15';
import { createClient } from 'npm:@supabase/supabase-js@2';

/* ---------------------------- Utils & typages ---------------------------- */

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function envOpt(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

async function alertError(message: string): Promise<void> {
  // Log console (toujours)
  console.error(message);

  // Envoi optionnel vers un webhook d’alerte
  const hook = envOpt('ALERT_WEBHOOK_URL');
  if (!hook) return;

  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Alert webhook failed', msg);
  }
}

/** Certaines anciennes sessions Stripe exposent encore customer_email */
type SessionWithLegacy = Stripe.Checkout.Session & {
  customer_email?: string | null;
};

/** Structure attendue pour le panier JSON sérialisé dans metadata.cart */
type CartItem = {
  quantity?: number;
  pass?: { id?: string | number | null };
  eventActivity?: { id?: string | number | null };
  timeSlot?: { id?: string | number | null };
};

type PgLikeError = { code?: string; message?: string };

/* -------------------------------- Secrets -------------------------------- */

const STRIPE_SECRET = env('STRIPE_SECRET'); // sk_test_...
const WEBHOOK_SECRET = env('WEBHOOK_SECRET'); // whsec_...
const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

/* ------------------------- Clients Stripe & Supabase ---------------------- */

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: '2024-04-10',
  // Deno/Edge: client HTTP basé sur fetch
  httpClient: Stripe.createFetchHttpClient(),
});

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* --------------------------------- Serveur -------------------------------- */

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  // Corps brut requis pour la vérification de signature Stripe
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('BAD_SIGNATURE', msg);
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  try {
    /* --------------------------- Idempotence simple --------------------------- */
    const { error: sErr } = await sbAdmin
      .from('stripe_sessions')
      .insert({ id: sessionId });
    if (sErr) {
      const pgCode = (sErr as PgLikeError | null)?.code;
      // 23505 = unique_violation (déjà traitée)
      if (pgCode === '23505') {
        console.warn('SESSION_ALREADY_PROCESSED', sessionId);
        return new Response('ok', { status: 200 });
      }
      throw sErr;
    }

    /* ----------------------------- Email du client ---------------------------- */
    let email: string | undefined =
      session.customer_details?.email ??
      (session as SessionWithLegacy).customer_email ??
      undefined;

    // metadata.customer peut contenir un JSON { email: "..." }
    if (!email && session.metadata?.customer) {
      try {
        const parsed: unknown = JSON.parse(session.metadata.customer);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'email' in parsed &&
          typeof (parsed as { email?: unknown }).email === 'string'
        ) {
          email = (parsed as { email: string }).email;
        }
      } catch {
        /* noop */
      }
    }

    // fallback via l’id customer -> retrieve
    if (!email && typeof session.customer === 'string') {
      const cust = await stripe.customers.retrieve(session.customer);
      if (!('deleted' in cust)) {
        email = cust.email ?? undefined;
      }
    }

    if (!email) {
      await alertError(`NO_EMAIL_IN_SESSION ${sessionId}`);
      return new Response('ok-no-email', { status: 200 });
    }

    /* --------------------------------- Panier -------------------------------- */
    let cartItems: CartItem[] = [];
    try {
      const rawCart: unknown = JSON.parse(session.metadata?.cart ?? '[]');
      cartItems = Array.isArray(rawCart) ? (rawCart as CartItem[]) : [];
    } catch {
      cartItems = [];
    }

    /* -------- Création des réservations + invocation de l’email -------- */
    for (const item of cartItems) {
      const qty = Math.max(1, Number(item?.quantity ?? 1));

      for (let i = 0; i < qty; i++) {
        const { data: res, error: insErr } = await sbAdmin
          .from('reservations')
          .insert({
            client_email: email,
            pass_id: item?.pass?.id ?? null,
            event_activity_id: item?.eventActivity?.id ?? null,
            time_slot_id: item?.timeSlot?.id ?? null,
            payment_status: 'paid',
          })
          .select('id')
          .single();

        if (insErr || !res) {
          throw insErr ?? new Error('Insert reservation failed');
        }

        if (item?.eventActivity?.id) {
          const { error: actErr } = await sbAdmin
            .from('reservation_activities')
            .insert({
              reservation_id: res.id,
              event_activity_id: item.eventActivity.id,
              time_slot_id: item?.timeSlot?.id ?? null,
            });
          if (actErr) {
            throw actErr;
          }
        }

        // Appel explicite de la fonction d’envoi d’email (Bearer service_role)
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/send-reservation-email`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ email, reservationId: res.id }),
          },
        );

        if (!r.ok) {
          const txt = await r.text();
          await alertError(
            `SEND_EMAIL_INVOKE_ERROR session=${sessionId} res=${res.id} :: ${r.status} ${txt}`,
          );
        }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await alertError(`WEBHOOK_HANDLER_ERROR session=${sessionId} :: ${msg}`);
    return new Response('server error', { status: 500 });
  }
});
