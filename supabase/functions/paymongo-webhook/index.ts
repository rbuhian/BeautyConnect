import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Package duration mapping (must match app constants)
const PACKAGE_DURATIONS: Record<string, number> = {
  boost_1d: 1,
  weekly: 7,
  monthly: 30,
  priority_category: 30,
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const event = body?.data?.attributes;

    if (!event) {
      return new Response('Invalid payload', { status: 400 });
    }

    // We handle checkout_session events
    const eventType = event.type;
    const checkoutData = event.data?.attributes;

    // Only process successful payments
    // PayMongo sends the checkout_session object with payment_intent status
    const payments = checkoutData?.payments;
    if (!payments || payments.length === 0) {
      // Not a payment event, acknowledge it
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const latestPayment = payments[0];
    const paymentStatus = latestPayment?.attributes?.status;

    if (paymentStatus !== 'paid') {
      return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
        status: 200,
      });
    }

    // Extract metadata from checkout session
    const metadata = checkoutData?.metadata;
    if (!metadata?.professional_id || !metadata?.package_key) {
      console.error('Missing metadata in webhook:', metadata);
      return new Response(JSON.stringify({ error: 'Missing metadata' }), { status: 400 });
    }

    const professionalId = metadata.professional_id;
    const packageKey = metadata.package_key;
    const amountPHP = metadata.amount_php || (latestPayment.attributes.amount / 100);
    const checkoutSessionId = body.data.id;

    // Calculate duration
    const durationDays = PACKAGE_DURATIONS[packageKey] || 1;

    // Use service role to bypass RLS for server-side operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for duplicate (idempotency)
    const { data: existing } = await supabase
      .from('featured_listings')
      .select('id')
      .eq('payment_ref', checkoutSessionId)
      .single();

    if (existing) {
      console.log('Duplicate webhook for session:', checkoutSessionId);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
      });
    }

    // Create the featured listing
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase
      .from('featured_listings')
      .insert({
        professional_id: professionalId,
        package: packageKey,
        price_paid: amountPHP,
        is_active: true,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        payment_ref: checkoutSessionId,
      });

    if (insertError) {
      console.error('Error creating featured listing:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create listing' }), {
        status: 500,
      });
    }

    console.log(`Featured listing created for ${professionalId}, package: ${packageKey}, ref: ${checkoutSessionId}`);

    return new Response(JSON.stringify({ received: true, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
});
