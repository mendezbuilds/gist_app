/**
 * Auth utilities — OTP send/verify, sign out, E.164 normalisation.
 *
 * Uses Supabase phone auth, which is configured to route SMS delivery
 * through an Africa's Talking Edge Function webhook (see supabase/functions/sms-webhook).
 * The app itself just calls standard supabase.auth.signInWithOtp / verifyOtp.
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { supabase } from './supabase';
import { ensureKeyPair, getPublicKeyB64 } from './crypto';
import type { Profile } from '../types/database';

// [TEMPORARY DEV-ONLY TEST PHONES - REMOVE BEFORE PRODUCTION LAUNCH]
export const DEV_TEST_PHONES = ['+2348000000000', '+2348000000001'];
export const DEV_TEST_OTP = '000000';

/**
 * Normalise a raw phone string to E.164.
 * Defaults to Nigeria (+234) if no country code prefix is present.
 * Returns null if the number is invalid after normalisation.
 */
export function normalisePhone(raw: string): string | null {
  try {
    // Strip all whitespace and dashes
    const cleaned = raw.replace(/[\s\-().]/g, '');

    // If user typed without country code and hasn't prefixed +, assume Nigeria
    const withPrefix = cleaned.startsWith('+') ? cleaned : `+234${cleaned.replace(/^0/, '')}`;

    if (!isValidPhoneNumber(withPrefix)) return null;
    const parsed = parsePhoneNumber(withPrefix);
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Send OTP to the given phone number via Supabase phone auth.
 * Supabase generates the 6-digit token and calls our sms-webhook Edge Function
 * which delivers it via Africa's Talking.
 */
export async function sendOTP(rawPhone: string): Promise<{ error: string | null }> {
  const phone = normalisePhone(rawPhone);
  if (!phone) {
    return { error: 'Please enter a valid phone number.' };
  }

  if (__DEV__ && DEV_TEST_PHONES.includes(phone)) {
    console.log(
      `[DEV ONLY] signInWithOtp for test phone: ${phone}. SMS delivery will be bypassed by Supabase.`
    );
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Verify OTP token entered by user.
 * On success: user is signed in, session is persisted via AsyncStorage.
 * Returns the user's id on success.
 */
export async function verifyOTP(
  rawPhone: string,
  token: string,
): Promise<{ userId: string | null; error: string | null }> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { userId: null, error: 'Invalid phone number.' };

  if (__DEV__ && DEV_TEST_PHONES.includes(phone)) {
    console.log(
      `[DEV ONLY] verifyOtp for test phone: ${phone} with token: ${token.trim()}.`
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.trim(),
    type: 'sms',
  });

  if (error || !data.user) {
    return { userId: null, error: error?.message ?? 'Verification failed.' };
  }

  return { userId: data.user.id, error: null };
}

/**
 * Complete new user registration after OTP verification.
 * 1. Generates (or retrieves) E2E key pair
 * 2. Creates profile row in Supabase
 */
export async function createProfile(opts: {
  userId: string;
  phone: string;
  phoneHash: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<{ error: string | null }> {
  try {
    console.log('[auth.ts] Starting createProfile with options:', {
      userId: opts.userId,
      phone: opts.phone,
      phoneHash: opts.phoneHash,
      username: opts.username,
      displayName: opts.displayName,
      avatarUrl: opts.avatarUrl,
    });
    
    const e2ePublicKey = await ensureKeyPair();
    console.log('[auth.ts] ensureKeyPair resolved public key:', e2ePublicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).insert({
      id: opts.userId,
      phone: opts.phone,
      phone_hash: opts.phoneHash,
      username: opts.username,
      display_name: opts.displayName,
      avatar_url: opts.avatarUrl ?? null,
      e2e_public_key: e2ePublicKey,
      onboarding_complete: false,
      notifications_enabled: false,
    });

    if (error) {
      console.error('[auth.ts] Supabase profiles insert error:', error);
      return { error: error.message };
    }
    
    console.log('[auth.ts] Profile successfully inserted');
    return { error: null };
  } catch (e: any) {
    console.error('[auth.ts] Exception caught in createProfile:', e);
    return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

/**
 * Mark onboarding as complete after permissions screen.
 */
export async function completeOnboarding(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ onboarding_complete: true })
    .eq('id', userId);
}

/**
 * Update notification preference in profile.
 */
export async function updateNotificationsEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ notifications_enabled: enabled })
    .eq('id', userId);
}

/**
 * Check username availability (debounce in the UI).
 * Returns true if available.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (username.length < 3) return false;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  return data === null;
}

/**
 * Fetch own profile.
 * If this is the logged-in user's profile, verifies E2E keys are synchronized.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return data ?? null;

  // Self-healing key sync: if this profile is the current user's profile
  try {
    const sessionUser = (await supabase.auth.getUser()).data.user;
    if (sessionUser && sessionUser.id === userId) {
      let localPubKey = await getPublicKeyB64();
      if (!localPubKey) {
        console.log('[auth.ts] No local key pair found. Generating new keys...');
        localPubKey = await ensureKeyPair();
      }

      if (data.e2e_public_key !== localPubKey) {
        console.warn(
          `[auth.ts] E2E public key mismatch for user ${userId}. Database: ${data.e2e_public_key}, Local: ${localPubKey}. Updating database...`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('profiles') as any)
          .update({ e2e_public_key: localPubKey })
          .eq('id', userId);

        if (updateError) {
          console.error('[auth.ts] Failed to update profile keys in DB:', updateError);
        } else {
          data.e2e_public_key = localPubKey;
          console.log('[auth.ts] Profile keys successfully synchronized.');
        }
      }
    }
  } catch (syncErr) {
    console.error('[auth.ts] Error during self-healing key sync:', syncErr);
  }

  return data;
}

/**
 * Sign out — clears Supabase session from AsyncStorage.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
