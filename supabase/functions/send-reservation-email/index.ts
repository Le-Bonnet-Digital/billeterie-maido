import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toDataURL } from 'https://esm.sh/qrcode@1?target=deno';
function env(name) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = env('RESEND_API_KEY');
const FROM_EMAIL = env('FROM_EMAIL');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
      }),
      {
        status: 405,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }
  try {
    const { email, reservationId } = await req.json();
    if (!email || !isValidEmail(email) || !reservationId) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
    const { data, error } = await supabase
      .from('reservations')
      .select('id, client_email, reservation_number')
      .eq('id', reservationId)
      .eq('client_email', email)
      .single();
    if (error || !data) {
      return new Response(
        JSON.stringify({
          error: 'Reservation not found',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
    const qr = await toDataURL(data.reservation_number);
    const base64 = qr.split(',')[1];
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Votre billet',
        html: `<p>Votre réservation <b>${data.reservation_number}</b> est confirmée.</p><img src="cid:qr.png" alt="QR"/>`,
        attachments: [
          {
            filename: 'qr.png',
            content: base64,
            cid: 'qr.png',
          },
        ],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('RESEND_ERROR', text);
      return new Response(
        JSON.stringify({
          error: `Email send failed: ${text}`,
        }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
    return new Response(
      JSON.stringify({
        sent: true,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e?.message ?? 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }
});
