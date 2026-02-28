import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'bookings@beautyconnect.ph';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type EmailTemplate =
  | 'booking_new_client'
  | 'booking_new_pro'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_reminder';

interface BookingEmailData {
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

interface RequestBody {
  userId: string;
  template: EmailTemplate;
  data: BookingEmailData;
  scheduledAt?: string;
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
  <!-- Header -->
  <tr>
    <td style="background:#7B1FA2;padding:28px 32px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
        💄 BeautyConnect
      </p>
    </td>
  </tr>
  <!-- Body -->
  <tr><td style="padding:32px;">${body}</td></tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">
        BeautyConnect · Maquillage.ph · Philippines<br/>
        <a href="mailto:support@beautyconnect.ph" style="color:#7B1FA2;">support@beautyconnect.ph</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#bbb;">
        To stop receiving email notifications, go to Settings → Email Notifications.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#666;width:40%;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#222;font-weight:600;">${value}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8f4ff;border-radius:8px;padding:16px;margin:20px 0;">
    ${rows}
  </table>`;
}

function phpAmount(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

// ─── Template renderers ───────────────────────────────────────────────────────

function renderTemplate(
  template: EmailTemplate,
  d: BookingEmailData
): { subject: string; html: string } {
  switch (template) {
    case 'booking_new_client': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#222;">Booking Request Received</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Hi ${d.clientName}, your booking request has been sent to <strong>${d.professionalName}</strong>.
          You'll be notified once they confirm.
        </p>
        ${detailTable(
          detailRow('Service', d.serviceName) +
          detailRow('Professional', d.professionalName) +
          detailRow('Date', d.date) +
          detailRow('Time', d.time) +
          detailRow('Location', d.locationText) +
          detailRow('Deposit Paid', phpAmount(d.depositAmount)) +
          detailRow('Total Price', phpAmount(d.totalPrice))
        )}
        <p style="margin:0;font-size:13px;color:#999;">Booking ID: ${d.bookingId}</p>`;
      return {
        subject: `Booking Request Received — ${d.serviceName} with ${d.professionalName}`,
        html: baseLayout('Booking Request Received', body),
      };
    }

    case 'booking_new_pro': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#222;">New Booking Request</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Hi ${d.professionalName}, you have a new booking request from <strong>${d.clientName}</strong>.
          Please open the app to accept or decline.
        </p>
        ${detailTable(
          detailRow('Client', d.clientName) +
          detailRow('Service', d.serviceName) +
          detailRow('Date', d.date) +
          detailRow('Time', d.time) +
          detailRow('Location', d.locationText)
        )}`;
      return {
        subject: `New Booking Request from ${d.clientName} — ${d.serviceName}`,
        html: baseLayout('New Booking Request', body),
      };
    }

    case 'booking_confirmed': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#2E7D32;">Booking Confirmed ✓</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Great news, ${d.clientName}! <strong>${d.professionalName}</strong> has confirmed your booking.
        </p>
        ${detailTable(
          detailRow('Service', d.serviceName) +
          detailRow('Professional', d.professionalName) +
          detailRow('Date', d.date) +
          detailRow('Time', d.time) +
          detailRow('Location', d.locationText) +
          detailRow('Remaining Balance', phpAmount(d.totalPrice - d.depositAmount))
        )}
        <p style="margin:20px 0 0;font-size:14px;color:#555;">
          Please pay the remaining balance of <strong>${phpAmount(d.totalPrice - d.depositAmount)}</strong>
          directly to your professional on the day of your appointment.
        </p>`;
      return {
        subject: `Booking Confirmed — ${d.serviceName} on ${d.date}`,
        html: baseLayout('Booking Confirmed', body),
      };
    }

    case 'booking_declined': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#C62828;">Booking Request Declined</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Hi ${d.clientName}, unfortunately <strong>${d.professionalName}</strong> was unable to accept
          your booking request for <strong>${d.serviceName}</strong> on ${d.date}.
        </p>
        <p style="margin:0;font-size:15px;color:#555;">
          Don't worry — there are many other talented professionals on BeautyConnect.
          Open the app to find and book another professional.
        </p>`;
      return {
        subject: `Booking Request Declined — ${d.serviceName}`,
        html: baseLayout('Booking Request Declined', body),
      };
    }

    case 'booking_cancelled': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#E65100;">Booking Cancelled</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Your booking has been cancelled. Details below:
        </p>
        ${detailTable(
          detailRow('Service', d.serviceName) +
          detailRow('Date', d.date) +
          detailRow('Time', d.time)
        )}
        <p style="margin:0;font-size:14px;color:#555;">
          If you have any questions, please contact us at
          <a href="mailto:support@beautyconnect.ph" style="color:#7B1FA2;">support@beautyconnect.ph</a>.
        </p>`;
      return {
        subject: `Booking Cancelled — ${d.serviceName} on ${d.date}`,
        html: baseLayout('Booking Cancelled', body),
      };
    }

    case 'booking_reminder': {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#7B1FA2;">Appointment Tomorrow 🗓</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#555;">
          Just a friendly reminder that you have an appointment tomorrow.
        </p>
        ${detailTable(
          detailRow('Service', d.serviceName) +
          detailRow('Professional', d.professionalName) +
          detailRow('Date', d.date) +
          detailRow('Time', d.time) +
          detailRow('Location', d.locationText)
        )}
        <p style="margin:0;font-size:14px;color:#555;">
          Open the app to view full booking details or chat with your professional.
        </p>`;
      return {
        subject: `Reminder: ${d.serviceName} tomorrow at ${d.time}`,
        html: baseLayout('Appointment Reminder', body),
      };
    }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { userId, template, data, scheduledAt }: RequestBody = await req.json();

    if (!userId || !template || !data) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get user email from auth.users
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user?.email) {
      // No email on file — silently succeed
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Check email_notifications preference
    const { data: prefs } = await supabaseAdmin
      .from('users')
      .select('email_notifications')
      .eq('id', userId)
      .single();

    if (prefs && prefs.email_notifications === false) {
      return new Response(JSON.stringify({ skipped: true, reason: 'opted_out' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Render template
    const { subject, html } = renderTemplate(template, data);

    // 4. Send via Resend
    const resendBody: Record<string, unknown> = {
      from: `BeautyConnect <${FROM_EMAIL}>`,
      to: [user.email],
      subject,
      html,
    };
    if (scheduledAt) {
      resendBody.scheduled_at = scheduledAt;
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: 'Email send failed', detail: resendData }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, id: resendData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
