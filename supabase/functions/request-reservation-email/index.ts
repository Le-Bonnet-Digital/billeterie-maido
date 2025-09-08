// Supabase Edge Function: request-reservation-email
// - Input: { email: string }
// - Behavior: If a paid reservation exists for the email, trigger the
//             `send-reservation-email` function and return success.
// - Security: Utilise le client Supabase côté serveur sans clé service role pour les requêtes,
//             mais invoque les fonctions protégées avec la clé service role.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = getEnvVar('SUPABASE_URL');
const anonKey = getEnvVar('SUPABASE_ANON_KEY');
const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, anonKey);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
      });
    }

    const { email } = (await req.json()) as { email?: string };
    console.warn('Request received', { email });

    if (!email || !isValidEmail(email)) {
      console.warn('Invalid email provided');
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
      });
    }

    // Look up latest paid reservation for this email
    const { data, error } = await supabase
      .from('reservations')
      .select('id, created_at')
      .eq('client_email', email)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Database error', { error });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    if (!data || data.length === 0) {
      console.warn('No reservation found');
      return new Response(JSON.stringify({ found: false }), { status: 200 });
    }

    const reservationId = data[0].id as string;
    console.warn('Reservation found', { reservationId });

    // Trigger the existing function that sends the email
    const { error: sendError } = await supabase.functions.invoke(
      'send-reservation-email',
      {
        body: { email, reservationId },
        headers: { Authorization: `Bearer ${serviceKey}` },
      },
    );

    if (sendError) {
      console.error('send-reservation-email failed', { error: sendError });
      return new Response(JSON.stringify({ error: sendError.message }), {
        status: 500,
      });
    }

    console.warn('Reservation email sent successfully');
    return new Response(JSON.stringify({ found: true, sent: true }), {
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
