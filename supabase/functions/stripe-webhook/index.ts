/* eslint-disable @typescript-eslint/no-explicit-any */ import Stripe from "https://esm.sh/stripe@15?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function env(name) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
function envOpt(name) {
  return Deno.env.get(name);
}
async function alertError(message) {
  console.error(message);
  const hook = envOpt("ALERT_WEBHOOK_URL");
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        message
      })
    });
  } catch (e) {
    console.error("Alert webhook failed", e);
  }
}
// --- Secrets (noms EXACTS)
const STRIPE_SECRET = env("STRIPE_SECRET"); // sk_test_...
const WEBHOOK_SECRET = env("WEBHOOK_SECRET"); // whsec_...
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
// ⚠️ Deno/Edge: forcer le client HTTP basé sur fetch
const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient()
});
const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
Deno.serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "content-type": "application/json"
      }
    });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", {
    status: 400
  });
  // Lire le corps BRUT puis utiliser l’API asynchrone
  const raw = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error("BAD_SIGNATURE", e instanceof Error ? e.message : e);
    return new Response("Bad signature", {
      status: 400
    });
  }
  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", {
      status: 200
    });
  }
  const session = event.data.object;
  const sessionId = session.id;
  try {
    // Idempotence
    const { error: sErr } = await sbAdmin.from("stripe_sessions").insert({
      id: sessionId
    });
    if (sErr) {
      if (sErr.code === "23505") {
        console.log("SESSION_ALREADY_PROCESSED", sessionId);
        return new Response("ok", {
          status: 200
        });
      }
      throw sErr;
    }
    // Email client
    let email = session.customer_details?.email ?? // @ts-ignore
    session.customer_email ?? undefined;
    if (!email && session.metadata?.customer) {
      try {
        const c = JSON.parse(session.metadata.customer);
        if (c?.email) email = c.email;
      } catch  {}
    }
    if (!email && typeof session.customer === "string") {
      const cust = await stripe.customers.retrieve(session.customer);
      if (!("deleted" in cust)) email = cust.email ?? undefined;
    }
    if (!email) {
      await alertError(`NO_EMAIL_IN_SESSION ${sessionId}`);
      return new Response("ok-no-email", {
        status: 200
      });
    }
    // Items du panier
    let cartItems = [];
    try {
      cartItems = JSON.parse(session.metadata?.cart ?? "[]");
    } catch  {
      cartItems = [];
    }
    // Créer les réservations et appeler la fonction d’envoi d’email
    for (const item of cartItems){
      const qty = Math.max(1, Number(item?.quantity ?? 1));
      for(let i = 0; i < qty; i++){
        const { data: res, error: insErr } = await sbAdmin.from("reservations").insert({
          client_email: email,
          pass_id: item?.pass?.id ?? null,
          event_activity_id: item?.eventActivity?.id ?? null,
          time_slot_id: item?.timeSlot?.id ?? null,
          payment_status: "paid"
        }).select("id").single();
        if (insErr || !res) throw insErr ?? new Error("Insert reservation failed");
        // Appel explicite de la fonction d’email avec Bearer service_role
        const r = await fetch(`${SUPABASE_URL}/functions/v1/send-reservation-email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            email,
            reservationId: res.id
          })
        });
        if (!r.ok) {
          const txt = await r.text();
          await alertError(`SEND_EMAIL_INVOKE_ERROR session=${sessionId} res=${res.id} :: ${r.status} ${txt}`);
        }
      }
    }
    return new Response("ok", {
      status: 200
    });
  } catch (e) {
    await alertError(`WEBHOOK_HANDLER_ERROR session=${sessionId} :: ${e?.message ?? e}`);
    return new Response("server error", {
      status: 500
    });
  }
});
