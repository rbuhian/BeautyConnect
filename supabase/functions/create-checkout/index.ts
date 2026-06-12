import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYMONGO_API = 'https://api.paymongo.com/v1';
const SUCCESS_URL = 'https://beautyconnect.app/payment/success';
const CANCEL_URL = 'https://beautyconnect.app/payment/cancel';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: return 200 with error field so the client app can read the actual message
// (Supabase JS client replaces non-2xx bodies with a generic error)
function errorResponse(message: string, debug?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...(debug ? { debug } : {}) }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', { authError: authError?.message });
    }

    // Parse request body
    const body = await req.json();
    const { amount, description } = body;
    const type = body.type || 'featured_listing';

    if (!amount || !description) {
      return errorResponse('Missing required fields: amount, description', { amount, description, type });
    }

    // Validate type-specific fields
    if (type === 'featured_listing' && (!body.packageKey || !body.professionalId)) {
      return errorResponse('Missing required fields: packageKey, professionalId');
    }

    if (type === 'booking_deposit' && !body.bookingId) {
      return errorResponse('Missing required field: bookingId');
    }

    // Create PayMongo Checkout Session
    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    if (!paymongoSecretKey) {
      return errorResponse('Payment not configured (missing PAYMONGO_SECRET_KEY)');
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
          payment_method_types: ['card', 'gcash', 'grab_pay'],
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
      console.error('PayMongo error:', JSON.stringify(errorData));
      const paymongoError = errorData?.errors?.[0]?.detail || 'PayMongo rejected the request';
      return errorResponse(paymongoError, {
        paymongo_status: paymongoResponse.status,
        paymongo_errors: errorData?.errors,
        type,
        amount,
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
    return errorResponse(`Internal server error: ${err.message || err}`);
  }
});
