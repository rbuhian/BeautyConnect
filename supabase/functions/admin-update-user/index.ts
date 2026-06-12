import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Shared secret set via: supabase secrets set ADMIN_FUNCTION_SECRET=<value>
const ADMIN_FUNCTION_SECRET = Deno.env.get('ADMIN_FUNCTION_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, password, adminSecret } = await req.json();

    // Validate secret
    if (!ADMIN_FUNCTION_SECRET || adminSecret !== ADMIN_FUNCTION_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!userId || !password) return json({ error: 'userId and password are required' }, 400);
    if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);

    return json({ success: true });
  } catch (err) {
    return json({ error: `Internal error: ${(err as Error).message}` }, 500);
  }
});
