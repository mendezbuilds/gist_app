/**
 * Edge Function: sms-webhook
 *
 * Supabase calls this webhook to deliver OTP SMS via Africa's Talking.
 * Configure in: Supabase Dashboard → Auth → Settings → SMS Provider → Custom
 * Set webhook URL to: https://<project-ref>.supabase.co/functions/v1/sms-webhook
 *
 * Supabase sends POST { Phone: string, OTP: string }
 *
 * Africa's Talking API key must be stored in Supabase Vault:
 *   - AT_API_KEY
 *   - AT_USERNAME
 *   - AT_SENDER_ID (optional, e.g. "GIST")
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawSecret = Deno.env.get('SEND_SMS_HOOK_SECRET');
    if (!rawSecret) {
      console.error('SEND_SMS_HOOK_SECRET environment variable is not set');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip standard webhook prefixes if present (e.g. whsec_)
    const cleanSecret = rawSecret.replace(/^whsec_/, '').trim();
    let secretBytes: Uint8Array;
    try {
      // Decode Base64 secret according to Standard Webhooks spec
      secretBytes = Uint8Array.from(atob(cleanSecret), (c) => c.charCodeAt(0));
    } catch {
      console.warn('Failed to Base64 decode SEND_SMS_HOOK_SECRET, falling back to raw string bytes');
      secretBytes = new TextEncoder().encode(cleanSecret);
    }

    // Try Bearer token verification fallback
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    let payload: any = null;
    
    const bodyText = await req.text();

    const authSecretCandidate = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    if (authHeader && (authSecretCandidate === cleanSecret || authSecretCandidate === rawSecret)) {
      isAuthorized = true;
      try {
        payload = JSON.parse(bodyText);
      } catch (err) {
        console.error('Failed to parse body JSON:', err);
      }
    } else {
      // Try HMAC-SHA256 signature verification matching Standard Webhooks / Svix spec
      const msgId = req.headers.get('webhook-id') || req.headers.get('svix-id');
      const msgTimestamp = req.headers.get('webhook-timestamp') || req.headers.get('svix-timestamp');
      const signature = req.headers.get('webhook-signature') ||
                        req.headers.get('svix-signature') ||
                        req.headers.get('x-supabase-signature') ||
                        req.headers.get('x-webhook-signature');
                        
      if (signature) {
        // Parse signatures from header (Standard Webhooks support space separated list, e.g. "v1,sig1 v1,sig2")
        const passedSignatures = signature.split(/\s+/).map((sig) => {
          if (sig.startsWith('v1,')) {
            return sig.substring(3);
          }
          if (sig.startsWith('v1=')) {
            return sig.substring(3);
          }
          return sig;
        });

        const key = await crypto.subtle.importKey(
          'raw',
          secretBytes,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );

        // Sign according to the Standard Webhooks spec: webhook-id + "." + webhook-timestamp + "." + body
        const encoder = new TextEncoder();
        const payloadToSign = (msgId && msgTimestamp)
          ? encoder.encode(`${msgId}.${msgTimestamp}.${bodyText}`)
          : encoder.encode(bodyText);

        const sigBuffer = await crypto.subtle.sign('HMAC', key, payloadToSign);
        const hashArray = Array.from(new Uint8Array(sigBuffer));
        const computedHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const computedBase64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

        const isMatch = passedSignatures.some(passedSig => 
          computedBase64 === passedSig ||
          computedHex.toLowerCase() === passedSig.toLowerCase()
        );

        if (isMatch) {
          isAuthorized = true;
          try {
            payload = JSON.parse(bodyText);
          } catch (err) {
            console.error('Failed to parse body JSON:', err);
          }
        } else {
          console.error(`Signature mismatch. Header: "${signature}", Cleaned Parts: ${JSON.stringify(passedSignatures)}, Computed Hex: "${computedHex}", Computed Base64: "${computedBase64}"`);
        }
      } else {
        console.error('No authorization header or signature header found on request. Headers:', Object.fromEntries(req.headers));
      }
    }

    if (!isAuthorized || !payload) {
      console.error('Unauthorized request received at sms-webhook');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both direct/flat payload and nested Auth Hook payload formats
    const phone = payload.Phone || payload.phone || payload.user?.phone;
    const otp = payload.OTP || payload.otp || payload.sms?.otp;

    if (!phone || !otp) {
      console.error('Missing phone or OTP in payload. Raw payload received:', payload);
      return new Response(JSON.stringify({ error: 'Missing Phone or OTP' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const atApiKey = Deno.env.get('AT_API_KEY');
    const atUsername = Deno.env.get('AT_USERNAME');
    const atSenderId = Deno.env.get('AT_SENDER_ID') ?? 'GIST';

    if (!atApiKey || !atUsername) {
      console.error('Africa\'s Talking credentials not configured in Supabase Vault');
      return new Response(
        JSON.stringify({ error: 'SMS provider not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const message = `Your Gist verification code is: ${otp}\n\nDo not share this code with anyone.`;

    const body = new URLSearchParams({
      username: atUsername,
      to: phone,
      message,
      from: atSenderId,
    });

    const atResponse = await fetch(
      'https://api.africastalking.com/version1/messaging',
      {
        method: 'POST',
        headers: {
          apiKey: atApiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    const atResult = await atResponse.json();

    if (!atResponse.ok) {
      console.error('Africa\'s Talking error:', atResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: atResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`OTP delivered via AT to ${phone.replace(/(\+\d{3})\d+(\d{4})/, '$1****$2')}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sms-webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
