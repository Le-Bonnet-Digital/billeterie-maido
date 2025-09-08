import Stripe from 'https://esm.sh/stripe@15?target=deno&dts';

function getEnv(name: string): string | undefined {
  return Deno.env.get(name);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  pass: { id: string; name: string; price: number };
  eventActivity?: { id: string };
  timeSlot?: { id: string };
  quantity: number;
}

interface Customer {
  email: string;
  [key: string]: unknown;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeSecret = getEnv('STRIPE_SECRET');
    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-04-10', // harmonisé avec le webhook (SDK v15)
      httpClient: Stripe.createFetchHttpClient(), // Deno/Edge friendly
    });

    const { cartItems, customer } = (await req.json()) as {
      cartItems?: CartItem[];
      customer?: Customer;
    };

    if (!cartItems || cartItems.length === 0 || !customer?.email) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') ?? new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer.email,
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.pass.name },
          unit_amount: Math.round(item.pass.price * 100),
        },
        quantity: item.quantity || 1,
      })),
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cart?canceled=true`,
      metadata: {
        cart: JSON.stringify(cartItems),
        customer: JSON.stringify(customer),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
