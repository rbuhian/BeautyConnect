import { supabase } from './supabase';

export type EmailTemplate =
  | 'booking_new_client'
  | 'booking_new_pro'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_reminder';

export interface BookingEmailData {
  bookingId: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  date: string;
  time: string;
  locationText: string;
  depositAmount: number;
  totalPrice: number;
}

/**
 * Invokes the send-email Edge Function. Always fire-and-forget — never throws.
 */
export async function sendEmailNotification(
  userId: string,
  template: EmailTemplate,
  data: BookingEmailData,
  scheduledAt?: Date
): Promise<void> {
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        userId,
        template,
        data,
        ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
      },
    });
  } catch (_) {
    // Silent — email must never block or error the booking flow
  }
}
