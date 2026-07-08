/**
 * Edge Function: match-contacts
 *
 * Receives a batch of SHA-256 hashed phone numbers from the client.
 * Returns matched profiles (public fields only).
 * Raw phone numbers are never stored or logged.
 *
 * Called by: src/lib/contacts.ts → syncContacts()
 * Auth: requires valid Supabase JWT (authenticated users only)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BATCH_SIZE = 500;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Use user's JWT for RLS-aware queries
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { hashes } = await req.json() as { hashes: string[] };

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap batch size
    const batch = hashes.slice(0, MAX_BATCH_SIZE);

    // Validate hashes are SHA-256 hex strings
    const validHashes = batch.filter((h) => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h));

    if (validHashes.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query profiles by phone_hash — only return public-safe fields
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, e2e_public_key, last_active_visible, last_active_at')
      .in('phone_hash', validHashes);

    if (error) {
      console.error('match-contacts query error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Never log matched profiles — only count
    console.log(`match-contacts: ${validHashes.length} hashes → ${data?.length ?? 0} matches`);

    return new Response(JSON.stringify({ matches: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('match-contacts error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
