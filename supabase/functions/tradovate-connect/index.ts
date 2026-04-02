// supabase/functions/tradovate-connect/index.ts
// Authenticates with Tradovate API using USER-PROVIDED credentials
// Credentials are received in the request body, used once, and NEVER stored.
// Only the resulting access token is persisted.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Tradovate API base URLs
const TRADOVATE_URLS = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate Supabase user
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

    // 2. Get user-provided Tradovate credentials from request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { username, password, environment } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ 
        error: 'Se requieren usuario y contraseña de Tradovate.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // App-level credentials (shared across all users, stored as env secrets)
    const appId = Deno.env.get('TRADOVATE_APP_ID');
    const appSecret = Deno.env.get('TRADOVATE_APP_SECRET');

    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ 
        error: 'Configuración de la aplicación incompleta. Contacta al administrador.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const env = (environment === 'live') ? 'live' : 'demo';
    const baseUrl = TRADOVATE_URLS[env];

    // 3. Authenticate with Tradovate using user's credentials
    // NOTE: Credentials are used ONLY for this request and are NEVER stored or logged
    const authResponse = await fetch(`${baseUrl}/auth/accessTokenRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: username,
        password: password,
        appId: appId,
        appVersion: '1.0',
        cid: appId,
        sec: appSecret,
      }),
    });

    if (!authResponse.ok) {
      // Update connection status to error
      await supabaseClient.from('tradovate_connections').upsert({
        user_id: user.id,
        status: 'error',
        error_message: `Error de autenticación: ${authResponse.status}. Verifica tu usuario y contraseña.`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ 
        error: 'Credenciales inválidas o error de autenticación con Tradovate.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const authData = await authResponse.json();

    if (authData.errorText) {
      await supabaseClient.from('tradovate_connections').upsert({
        user_id: user.id,
        status: 'error',
        error_message: authData.errorText,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ error: authData.errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const accessToken = authData.accessToken;
    const tokenExpiry = new Date(authData.expirationTime).toISOString();
    const tradovateUserId = authData.userId;

    // 4. Fetch Tradovate accounts
    const accountsResponse = await fetch(`${baseUrl}/account/list`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    let accountsList: any[] = [];
    if (accountsResponse.ok) {
      accountsList = await accountsResponse.json();
    }

    // 5. Upsert connection state in DB
    // IMPORTANT: We store ONLY the token and metadata. Password is NEVER persisted.
    const { error: upsertError } = await supabaseClient.from('tradovate_connections').upsert({
      user_id: user.id,
      access_token: accessToken,
      token_expiry: tokenExpiry,
      tradovate_user_id: tradovateUserId,
      tradovate_environment: env,
      accounts_cache: accountsList,
      status: 'connected',
      error_message: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (upsertError) {
      throw new Error('Error al guardar la conexión');
    }

    // 6. Return success (NO credentials in response)
    return new Response(JSON.stringify({
      status: 'connected',
      accounts: accountsList.map((a: any) => ({
        id: a.id,
        name: a.name,
        nickname: a.nickname,
      })),
      userId: tradovateUserId,
      tokenExpiry,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Error interno del servidor' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
