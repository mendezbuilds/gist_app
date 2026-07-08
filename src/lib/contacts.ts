/**
 * Contact sync utilities
 *
 * Flow:
 * 1. Request contacts permission
 * 2. Read all contacts, extract phone numbers
 * 3. Normalise to E.164 + hash with SHA-256 client-side
 * 4. POST hashes to match-contacts Edge Function
 * 5. Receive matched profiles (no raw phones stored server-side)
 */

import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { hashPhones } from './crypto';
import { normalisePhone } from './auth';
import type { PublicProfile } from '../types/database';

export type ContactPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Request contacts permission from the OS.
 */
export async function requestContactsPermission(): Promise<ContactPermissionStatus> {
  if (Platform.OS === 'web') {
    // Gracefully handle web by mocking 'granted' so the app doesn't block onboarding
    return 'granted';
  }
  const { status } = await Contacts.requestPermissionsAsync();
  return status as ContactPermissionStatus;
}

/**
 * Read all contacts from the device, extract and deduplicate phone numbers,
 * normalise to E.164 (+234 default), and return raw phone list.
 * Note: raw phones never leave this function — they are hashed in syncContacts.
 */
async function readPhoneNumbers(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return []; // No contacts on web
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  const seen = new Set<string>();
  const phones: string[] = [];

  for (const contact of data) {
    if (!contact.phoneNumbers) continue;
    for (const { number } of contact.phoneNumbers) {
      if (!number) continue;
      const e164 = normalisePhone(number);
      if (e164 && !seen.has(e164)) {
        seen.add(e164);
        phones.push(e164);
      }
    }
  }

  return phones;
}

/**
 * Full contact sync flow.
 * Hashes contacts client-side, posts to Edge Function, returns matched profiles.
 */
export async function syncContacts(): Promise<{
  matches: PublicProfile[];
  error: string | null;
}> {
  try {
    const phones = await readPhoneNumbers();
    if (phones.length === 0) return { matches: [], error: null };

    const hashes = await hashPhones(phones);

    // Batch into chunks of 500 to stay within Edge Function body limits
    const BATCH_SIZE = 500;
    const allMatches: PublicProfile[] = [];

    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batch = hashes.slice(i, i + BATCH_SIZE);

      const { data, error } = await supabase.functions.invoke<{
        matches: PublicProfile[];
      }>('match-contacts', {
        body: { hashes: batch },
      });

      if (error) {
        return { matches: [], error: error.message };
      }
      if (data?.matches) {
        allMatches.push(...data.matches);
      }
    }

    return { matches: allMatches, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Contact sync failed.';
    return { matches: [], error: message };
  }
}
