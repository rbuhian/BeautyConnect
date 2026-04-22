import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_FUNCTION_SECRET = Deno.env.get('ADMIN_FUNCTION_SECRET') ?? '';
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message, adminSecret } = await req.json();

    if (!ADMIN_FUNCTION_SECRET || adminSecret !== ADMIN_FUNCTION_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (!message?.trim()) return json({ error: 'Message is required' }, 400);

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get all non-admin users
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id')
      .neq('role', 'admin');

    if (usersError) return json({ error: usersError.message }, 500);

    const userIds: string[] = (users || []).map((u: any) => u.id);

    // 2. Insert notification_logs for every user
    if (userIds.length > 0) {
      const logs = userIds.map((id) => ({
        user_id: id,
        title: 'Announcement',
        body: message,
        type: 'announcement',
      }));

      for (let i = 0; i < logs.length; i += 100) {
        const { error } = await db.from('notification_logs').insert(logs.slice(i, i + 100));
        if (error) console.warn('notification_logs insert error:', error.message);
      }
    }

    // 3. Get all active push tokens for those users
    const { data: tokenRows } = await db
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokenRows && tokenRows.length > 0) {
      const messages = tokenRows.map((row: any) => ({
        to: row.token,
        title: 'Announcement',
        body: message,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }));

      for (let i = 0; i < messages.length; i += 100) {
        await fetch(EXPO_PUSH_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(messages.slice(i, i + 100)),
        }).catch(() => {});
      }
    }

    return json({ success: true, notified: userIds.length });
  } catch (err) {
    return json({ error: `Internal error: ${(err as Error).message}` }, 500);
  }
});
