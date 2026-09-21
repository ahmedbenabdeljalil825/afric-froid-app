import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is ADMIN
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

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Only admins can update users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { userId, password, fullName, role, isActive, config, mqttConfig, companyId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update Auth user if password or email (via companyId) changes
    const updateData: any = {};
    if (password) updateData.password = password;
    if (companyId) updateData.email = `${companyId.trim().toLowerCase()}@africfroid.app`;
    if (fullName) updateData.user_metadata = { ...(updateData.user_metadata || {}), full_name: fullName };
    if (companyId) updateData.user_metadata = { ...(updateData.user_metadata || {}), company_id: companyId };

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, updateData);
      if (authError) {
        return new Response(JSON.stringify({ error: 'Auth update failed: ' + authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update Profiles table
    const profileUpdate: any = {
      full_name: fullName,
      role: role,
      is_active: isActive !== undefined ? isActive : true,
      config: config,
      mqtt_config: mqttConfig,
      company_id: companyId,
    };
    if (password) profileUpdate.password = password;

    const { error: profileError } = await adminClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Profile update failed: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
