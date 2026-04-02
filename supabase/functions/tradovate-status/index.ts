// supabase/functions/tradovate-status/index.ts
// Returns current Tradovate connection status for the authenticated user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Query connection state
    const { data: connection, error } = await supabaseClient
      .from('tradovate_connections')
      .select('status, last_sync_at, accounts_cache, error_message, token_expiry, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!connection) {
      return new Response(JSON.stringify({
        status: 'disconnected',
        lastSyncAt: null,
        accounts: [],
        errorMessage: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check if token is expired
    let effectiveStatus = connection.status;
    if (connection.status === 'connected' && connection.token_expiry) {
      const expiry = new Date(connection.token_expiry);
      if (expiry < new Date()) {
        effectiveStatus = 'disconnected';
      }
    }

    const accounts = (connection.accounts_cache || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      nickname: a.nickname,
    }));

    return new Response(JSON.stringify({
      status: effectiveStatus,
      lastSyncAt: connection.last_sync_at,
      accounts,
      errorMessage: connection.error_message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in tradovate-status:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
