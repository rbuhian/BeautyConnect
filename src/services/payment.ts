import { supabase } from './supabase';
import { FeaturedPackageKey } from '../types';

export interface ServiceError {
  message: string;
  code?: string;
}

export interface ServiceResponse<T = void> {
  data: T | null;
  error: ServiceError | null;
}

/**
 * Create a PayMongo Checkout Session via Supabase Edge Function
 */
export async function createCheckoutSession(
  packageKey: FeaturedPackageKey,
  professionalId: string,
  amount: number,
  description: string
): Promise<ServiceResponse<{ checkoutUrl: string; sessionId: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        packageKey,
        professionalId,
        amount,
        description,
      },
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      return {
        data: null,
        error: { message: error.message || 'Failed to create checkout session', code: 'CHECKOUT_ERROR' },
      };
    }

    if (!data?.checkoutUrl || !data?.sessionId) {
      return {
        data: null,
        error: { message: 'Invalid checkout response', code: 'INVALID_RESPONSE' },
      };
    }

    return { data: { checkoutUrl: data.checkoutUrl, sessionId: data.sessionId }, error: null };
  } catch (err) {
    console.error('Unexpected error in createCheckoutSession:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * Check if a payment has been processed by looking for the featured listing
 * The webhook creates the listing after successful payment
 */
export async function checkPaymentStatus(
  sessionId: string
): Promise<'paid' | 'pending'> {
  try {
    const { data } = await supabase
      .from('featured_listings')
      .select('id')
      .eq('payment_ref', sessionId)
      .single();

    return data ? 'paid' : 'pending';
  } catch {
    return 'pending';
  }
}

/**
 * Poll for payment completion with retries
 * Webhook may take a few seconds to process
 */
export async function waitForPayment(
  sessionId: string,
  maxAttempts: number = 10,
  intervalMs: number = 2000
): Promise<'paid' | 'pending'> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkPaymentStatus(sessionId);
    if (status === 'paid') return 'paid';
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return 'pending';
}

// ============================================
// BOOKING DEPOSIT PAYMENTS
// ============================================

/**
 * Create a PayMongo Checkout Session for a booking deposit
 */
export async function createDepositCheckout(
  bookingId: string,
  amount: number,
  serviceName: string
): Promise<ServiceResponse<{ checkoutUrl: string; sessionId: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        type: 'booking_deposit',
        bookingId,
        amount,
        description: `Deposit for ${serviceName}`,
      },
    });

    if (error) {
      console.error('Error creating deposit checkout:', error, 'Response data:', data);
      // When edge function returns non-2xx, actual error details may be in data
      const errorDetail = data?.error || error.message || 'Failed to create deposit checkout';
      return {
        data: null,
        error: { message: errorDetail, code: 'CHECKOUT_ERROR' },
      };
    }

    if (!data?.checkoutUrl || !data?.sessionId) {
      console.error('Invalid deposit checkout response:', JSON.stringify(data));
      return {
        data: null,
        error: { message: data?.error || 'Invalid checkout response', code: 'INVALID_RESPONSE' },
      };
    }

    return { data: { checkoutUrl: data.checkoutUrl, sessionId: data.sessionId }, error: null };
  } catch (err) {
    console.error('Unexpected error in createDepositCheckout:', err);
    return {
      data: null,
      error: { message: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' },
    };
  }
}

/**
 * Check if a booking deposit has been paid
 */
export async function checkDepositStatus(
  bookingId: string
): Promise<'paid' | 'pending'> {
  try {
    const { data } = await supabase
      .from('bookings')
      .select('deposit_paid')
      .eq('id', bookingId)
      .single();

    return data?.deposit_paid ? 'paid' : 'pending';
  } catch {
    return 'pending';
  }
}

/**
 * Poll for deposit payment completion
 */
export async function waitForDepositPayment(
  bookingId: string,
  maxAttempts: number = 10,
  intervalMs: number = 2000
): Promise<'paid' | 'pending'> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkDepositStatus(bookingId);
    if (status === 'paid') return 'paid';
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return 'pending';
}
