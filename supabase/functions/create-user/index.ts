import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with caller's JWT to check their role
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is ADMIN
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body - removed username
    const { companyId, password, fullName, role, config, mqttConfig } = await req.json();

    if (!companyId || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: companyId, password, fullName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to create the user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const syntheticEmail = `${companyId.trim().toLowerCase()}@africfroid.app`;

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        company_id: companyId 
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update profile (created by trigger) - using company_id instead of username
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        company_id: companyId,
        full_name: fullName,
        role: role || 'CLIENT',
        is_active: true,
        config: config || null,
        mqtt_config: mqttConfig || null,
        password: password,
      })
      .eq('id', newUser.user!.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: 'User created but profile update failed: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user!.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
