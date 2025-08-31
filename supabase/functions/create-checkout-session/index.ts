import Stripe from 'https://esm.sh/stripe@13?target=deno';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

const stripe = new Stripe(getEnv('STRIPE_SECRET'), {
  apiVersion: '2023-10-16',
});

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

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const { cartItems, customer } = (await req.json()) as {
      cartItems?: CartItem[];
      customer?: Customer;
    };

    if (!cartItems || cartItems.length === 0 || !customer?.email) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
      });
    }

    const origin = new URL(req.url).origin;

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
      success_url: `${origin}/cart?success=true`,
      cancel_url: `${origin}/cart?canceled=true`,
      metadata: {
        cart: JSON.stringify(cartItems),
        customer: JSON.stringify(customer),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
});
