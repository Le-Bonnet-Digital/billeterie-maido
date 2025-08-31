import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const supabase = createClient(
  getEnvVar('SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Reservation {
  id: string;
  client_email: string;
  reservation_number: string | null;
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
      });
    }

    const { email, reservationId } = (await req.json()) as {
      email?: string;
      reservationId?: string;
    };

    if (!email || !isValidEmail(email) || !reservationId) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('id, client_email, reservation_number')
      .eq('id', reservationId)
      .eq('client_email', email)
      .single<Reservation>();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
      });
    }

    const apiKey = getEnvVar('RESEND_API_KEY');
    const fromEmail = getEnvVar('FROM_EMAIL');

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Votre billet',
        html: `<p>Votre réservation ${data.reservation_number ?? data.id} est confirmée.</p>`,
      }),
    });

    if (!sendRes.ok) {
      const text = await sendRes.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${text}` }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
