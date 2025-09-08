import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno&dts';
import QRCode from 'https://esm.sh/qrcode@1?target=deno&dts';

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = env('RESEND_API_KEY');
const FROM_EMAIL = env('FROM_EMAIL');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ReservationRow = {
  id: string;
  client_email: string;
  reservation_number: string;
};

type SendPayload = {
  email: string;
  reservationId: string;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const { email, reservationId } = (await req.json()) as Partial<SendPayload>;

    if (!email || !isValidEmail(email) || !reservationId) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('id, client_email, reservation_number')
      .eq('id', reservationId)
      .eq('client_email', email)
      .single<ReservationRow>();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Génère un QR en DataURL (PNG base64) à partir du numéro de réservation
    const qrDataUrl = await QRCode.toDataURL(data.reservation_number);
    const base64 = qrDataUrl.split(',')[1] ?? '';

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
            // Lier l'image dans le HTML via cid:qr.png
            cid: 'qr.png',
          },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('RESEND_ERROR', text);
      return new Response(
        JSON.stringify({ error: `Email send failed: ${text}` }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
