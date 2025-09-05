/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "https://esm.sh/stripe@15?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
function envOpt(name: string): string | undefined {
  return Deno.env.get(name);
}

async function alertError(message: string) {
  console.error(message);
  const hook = envOpt("ALERT_WEBHOOK_URL");
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch (e) {
    console.error("Alert webhook failed", e);
  }
}

// --- Secrets (noms EXACTS selon ta capture)
const STRIPE_SECRET = env("STRIPE_SECRET");               // sk_test_...
const WEBHOOK_SECRET = env("WEBHOOK_SECRET");             // whsec_...
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });
const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  // Lire le CORPS BRUT (obligatoire pour constructEvent)
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error("BAD_SIGNATURE", e instanceof Error ? e.message : e);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  try {
    // Idempotence : ignorer si déjà traité
    const { error: sErr } = await sbAdmin
      .from("stripe_sessions")
      .insert({ id: sessionId });
    if (sErr) {
      if ((sErr as any).code === "23505") {
        console.log("SESSION_ALREADY_PROCESSED", sessionId);
        return new Response("ok", { status: 200 });
      }
      throw sErr;
    }

    // Email client (priorité: customer_details.email -> customer_email -> metadata.customer.email -> API)
    let email =
      session.customer_details?.email ??
      // @ts-ignore (présent si fourni à la création de session)
      (session as any).customer_email ??
      undefined;

    if (!email && session.metadata?.customer) {
      try {
        const c = JSON.parse(session.metadata.customer);
        if (c?.email) email = c.email;
      } catch { /* ignore */ }
    }

    if (!email && typeof session.customer === "string") {
      const cust = await stripe.customers.retrieve(session.customer);
      if (!("deleted" in cust)) email = cust.email ?? undefined;
    }

    if (!email) {
      await alertError(`NO_EMAIL_IN_SESSION ${sessionId}`);
      return new Response("ok-no-email", { status: 200 });
    }

    // Items du panier (contrat app)
    let cartItems: any[] = [];
    try {
      cartItems = JSON.parse(session.metadata?.cart ?? "[]");
    } catch {
      cartItems = [];
    }

    // Créer les réservations et appeler la fonction d’envoi d’email
    for (const item of cartItems) {
      const qty = Math.max(1, Number(item?.quantity ?? 1));
      for (let i = 0; i < qty; i++) {
        const { data: res, error: insErr } = await sbAdmin
          .from("reservations")
          .insert({
            client_email: email,
            pass_id: item?.pass?.id ?? null,
            event_activity_id: item?.eventActivity?.id ?? null,
            time_slot_id: item?.timeSlot?.id ?? null,
            payment_status: "paid",
          })
          .select("id")
          .single();

        if (insErr || !res) throw insErr ?? new Error("Insert reservation failed");

        // Appel EXPLICITE de la fonction (JWT = service_role)
        const invokeUrl = `${SUPABASE_URL}/functions/v1/send-reservation-email`;
        const r = await fetch(invokeUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // ⚠️ JWT obligatoire car send-reservation-email garde verify_jwt=true
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ email, reservationId: res.id }),
        });

        if (!r.ok) {
          const txt = await r.text();
          await alertError(
            `SEND_EMAIL_INVOKE_ERROR session=${sessionId} res=${res.id} :: ${r.status} ${txt}`
          );
          // On continue : réservation créée, email à rejouer manuellement si besoin
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e: any) {
    await alertError(
      `WEBHOOK_HANDLER_ERROR session=${sessionId} :: ${e?.message ?? e}`
    );
    // Ne pas marquer traité : Stripe relivrera l’event
    return new Response("server error", { status: 500 });
  }
});
