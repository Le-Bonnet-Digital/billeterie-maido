// Supabase Edge Function: request-reservation-email
// - Input: { email: string }
// - Behavior: Si une réservation payée existe pour l'email, déclenche
//             la fonction `send-reservation-email` et renvoie success.
// - Sécurité: lecture via client anon ; invocation de la fonction email
//             via fetch + Authorization: Bearer SERVICE_ROLE.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno&dts';

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const SUPABASE_URL = getEnvVar('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type RequestBody = { email?: string };
type ReservationRow = { id: string; created_at: string };

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { email } = (await req.json()) as RequestBody;
    console.warn('Request received', { email });

    if (!email || !isValidEmail(email)) {
      console.warn('Invalid email provided');
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Dernière réservation payée pour cet email
    const { data, error } = await supabase
      .from('reservations')
      .select('id, created_at')
      .eq('client_email', email)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<ReservationRow[]>(); // typage de retour

    if (error) {
      console.error('Database error', { error });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!data || data.length === 0) {
      console.warn('No reservation found');
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const reservationId = data[0].id;
    console.warn('Reservation found', { reservationId });

    // Appel de la fonction d’envoi d’email (même pattern que le webhook Stripe)
    const resp = await fetch(
      `${SUPABASE_URL}/functions/v1/send-reservation-email`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ email, reservationId }),
      },
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error('send-reservation-email failed', text);
      return new Response(JSON.stringify({ error: text }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    console.warn('Reservation email sent successfully');
    return new Response(JSON.stringify({ found: true, sent: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
