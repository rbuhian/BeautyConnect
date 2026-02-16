import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYMONGO_API = 'https://api.paymongo.com/v1';
const SUCCESS_URL = 'https://beautyconnect.app/payment/success';
const CANCEL_URL = 'https://beautyconnect.app/payment/cancel';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const { amount, description } = body;
    const type = body.type || 'featured_listing';

    if (!amount || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields: amount, description' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate type-specific fields
    if (type === 'featured_listing' && (!body.packageKey || !body.professionalId)) {
      return new Response(JSON.stringify({ error: 'Missing required fields: packageKey, professionalId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'booking_deposit' && !body.bookingId) {
      return new Response(JSON.stringify({ error: 'Missing required field: bookingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create PayMongo Checkout Session
    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    if (!paymongoSecretKey) {
      return new Response(JSON.stringify({ error: 'Payment not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build metadata based on payment type
    const metadata = type === 'booking_deposit'
      ? {
          type: 'booking_deposit',
          booking_id: body.bookingId,
          client_id: user.id,
          amount_php: amount,
        }
      : {
          type: 'featured_listing',
          professional_id: body.professionalId,
          package_key: body.packageKey,
          user_id: user.id,
          amount_php: amount,
        };

    const checkoutDescription = type === 'booking_deposit'
      ? `BeautyConnect Booking Deposit - ${description}`
      : `BeautyConnect Featured Listing - ${description}`;

    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [
            {
              name: description,
              amount: amount * 100, // Convert PHP to centavos
              currency: 'PHP',
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash', 'card', 'grab_pay', 'paymaya'],
          success_url: SUCCESS_URL,
          cancel_url: CANCEL_URL,
          description: checkoutDescription,
          metadata,
        },
      },
    };

    const paymongoResponse = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(paymongoSecretKey + ':')}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!paymongoResponse.ok) {
      const errorData = await paymongoResponse.json();
      console.error('PayMongo error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymongoData = await paymongoResponse.json();
    const checkoutUrl = paymongoData.data.attributes.checkout_url;
    const sessionId = paymongoData.data.id;

    return new Response(
      JSON.stringify({ checkoutUrl, sessionId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error in create-checkout:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
