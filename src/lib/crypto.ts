/**
 * Crypto utilities
 *
 * Responsibilities:
 * 1. Generate a Curve25519 key pair (X25519) at first registration
 * 2. Persist private key in Expo SecureStore (never leaves device)
 * 3. Return public key in base64 for upload to profiles.e2e_public_key
 * 4. Hash phone numbers with SHA-256 for contact matching (no raw numbers sent)
 *
 * Note: This is Phase 1's crypto foundation. Phase 2 adds the full
 * X3DH session establishment and Double-Ratchet per-message encryption.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

// Set up PRNG for tweetnacl using expo-crypto's secure random generator
nacl.setPRNG((x, n) => {
  const randomBytes = Crypto.getRandomValues(new Uint8Array(n));
  x.set(randomBytes);
});

import { useAuthStore } from '../store/authStore';

const PRIVATE_KEY_STORE_KEY = 'gist_e2e_private_key';
const PUBLIC_KEY_STORE_KEY = 'gist_e2e_public_key';

// [TEMPORARY DEV-ONLY HARDCODED TEST KEYS - REMOVE BEFORE PRODUCTION LAUNCH]
export const DEV_TEST_KEYS: Record<string, { public: string; private: string }> = {
  '+2348000000000': {
    public: 'DY2WQzLEHEahHEPCFiRtAdneARKlqsprQ+1hg4aJzTs=',
    private: 'EtOo/0MJuhgJnLbC1KrtthtAzA32ckseDiJHhUNkCaU='
  },
  '+2348000000001': {
    public: 'd15JxPi3e/W02PUs8QOKIQpa7+S5kk5v9JhmKVzh/Gs=',
    private: 'pSZFckqAQDQuHlDTf7O2JXVLRDNcaJ+GAxlE+wblPA4='
  }
};

export type KeyPair = {
  publicKeyB64: string;
  privateKeyB64: string;
};

/**
 * Generate a fresh Curve25519 (X25519) key pair.
 * Used once at registration; keys are stable for the lifetime of the install.
 */
export function generateKeyPair(): KeyPair {
  const pair = nacl.box.keyPair();
  return {
    publicKeyB64: encodeBase64(pair.publicKey),
    privateKeyB64: encodeBase64(pair.secretKey),
  };
}

/**
 * Persist key pair to SecureStore.
 * Private key: SecureStore (hardware-backed on supported devices)
 * Public key: also cached in SecureStore for quick retrieval
 */
export async function storeKeyPair(pair: KeyPair): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRIVATE_KEY_STORE_KEY, pair.privateKeyB64);
      localStorage.setItem(PUBLIC_KEY_STORE_KEY, pair.publicKeyB64);
    }
    return;
  }

  await SecureStore.setItemAsync(PRIVATE_KEY_STORE_KEY, pair.privateKeyB64, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(PUBLIC_KEY_STORE_KEY, pair.publicKeyB64, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Retrieve stored private key (base64). Returns null if not yet generated.
 */
export async function getPrivateKeyB64(): Promise<string | null> {
  if (__DEV__) {
    const phone = useAuthStore.getState().session?.user?.phone;
    if (phone && DEV_TEST_KEYS[phone]) {
      return DEV_TEST_KEYS[phone].private;
    }
  }
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(PRIVATE_KEY_STORE_KEY) : null;
  }
  return SecureStore.getItemAsync(PRIVATE_KEY_STORE_KEY);
}

/**
 * Retrieve stored private key. Returns null if not yet generated.
 */
export async function getPrivateKey(): Promise<Uint8Array | null> {
  const b64 = await getPrivateKeyB64();
  if (!b64) return null;
  return decodeBase64(b64);
}

/**
 * Retrieve stored public key (base64). Returns null if not yet generated.
 */
export async function getPublicKeyB64(): Promise<string | null> {
  if (__DEV__) {
    const phone = useAuthStore.getState().session?.user?.phone;
    if (phone && DEV_TEST_KEYS[phone]) {
      return DEV_TEST_KEYS[phone].public;
    }
  }
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(PUBLIC_KEY_STORE_KEY) : null;
  }
  return SecureStore.getItemAsync(PUBLIC_KEY_STORE_KEY);
}

/**
 * Check whether a key pair already exists on this device.
 */
export async function hasKeyPair(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(PRIVATE_KEY_STORE_KEY) !== null : false;
  }
  const key = await SecureStore.getItemAsync(PRIVATE_KEY_STORE_KEY);
  return key !== null;
}

/**
 * Generate + store key pair if one doesn't already exist.
 * Returns the public key (base64) for uploading to Supabase.
 * Idempotent — safe to call on every registration attempt.
 */
export async function ensureKeyPair(): Promise<string> {
  const existing = await getPublicKeyB64();
  if (existing) return existing;

  const pair = generateKeyPair();
  await storeKeyPair(pair);
  return pair.publicKeyB64;
}

/**
 * SHA-256 hash a phone number string for contact matching.
 * Input should be E.164 normalised (e.g. "+2348012345678").
 * Returns lowercase hex digest.
 *
 * This is a one-way hash — the server never sees raw phone numbers.
 */
export async function hashPhone(phone: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    phone.trim().toLowerCase(),
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest;
}

/**
 * Hash a batch of phone numbers.
 */
export async function hashPhones(phones: string[]): Promise<string[]> {
  return Promise.all(phones.map(hashPhone));
}

/**
 * Helper to convert Uint8Array to Postgres-compatible hex string (\x...)
 */
export function bytesToHex(byteArray: Uint8Array): string {
  return '\\x' + Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper to convert Postgres hex string (\x...) back to Uint8Array
 */
export function hexToBytes(hexString: string): Uint8Array {
  const cleanHex = hexString.startsWith('\\x') ? hexString.slice(2) : hexString.startsWith('x') ? hexString.slice(1) : hexString;
  const length = cleanHex.length;
  const byteArray = new Uint8Array(length / 2);
  for (let i = 0; i < length; i += 2) {
    byteArray[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return byteArray;
}

/**
 * Derive a shared key using nacl.box.before(theirPublicKey, myPrivateKey)
 */
export function deriveSharedKey(theirPublicKeyB64: string, myPrivateKeyB64: string): Uint8Array {
  const theirPublicKey = decodeBase64(theirPublicKeyB64);
  const myPrivateKey = decodeBase64(myPrivateKeyB64);
  return nacl.box.before(theirPublicKey, myPrivateKey);
}

/**
 * Encrypt message using nacl.secretbox()
 */
export function encryptMessageDirect(plaintext: string, sharedKey: Uint8Array): { ciphertextBytes: Uint8Array; nonceB64: string } {
  const messageBytes = decodeUTF8(plaintext);
  const nonce = nacl.randomBytes(24);
  const ciphertextBytes = nacl.secretbox(messageBytes, nonce, sharedKey);
  return {
    ciphertextBytes,
    nonceB64: encodeBase64(nonce),
  };
}

/**
 * Decrypt message using nacl.secretbox.open()
 */
export function decryptMessageDirect(ciphertextBytes: Uint8Array, nonceB64: string, sharedKey: Uint8Array): string | null {
  const nonce = decodeBase64(nonceB64);
  const decrypted = nacl.secretbox.open(ciphertextBytes, nonce, sharedKey);
  if (!decrypted) return null;
  return encodeUTF8(decrypted);
}

/**
 * Encrypt a message for group members pairwise.
 * Returns a serialized JSON payload as Uint8Array bytes containing the encrypted copies for all members.
 */
export function encryptMessageGroup(
  plaintext: string,
  memberKeys: Record<string, string>, // userId -> publicKeyB64
  myPrivateKeyB64: string,
  myUserId: string
): { payloadBytes: Uint8Array; senderNonceB64: string } {
  const encryptedMap: Record<string, { ciphertextB64: string; nonceB64: string }> = {};
  let senderNonce = '';

  for (const [userId, publicKeyB64] of Object.entries(memberKeys)) {
    const sharedKey = deriveSharedKey(publicKeyB64, myPrivateKeyB64);
    const { ciphertextBytes, nonceB64 } = encryptMessageDirect(plaintext, sharedKey);
    encryptedMap[userId] = {
      ciphertextB64: encodeBase64(ciphertextBytes),
      nonceB64: nonceB64,
    };
    if (userId === myUserId) {
      senderNonce = nonceB64;
    }
  }

  const jsonStr = JSON.stringify(encryptedMap);
  const payloadBytes = decodeUTF8(jsonStr);

  return {
    payloadBytes,
    senderNonceB64: senderNonce || Object.values(encryptedMap)[0]?.nonceB64 || '',
  };
}

/**
 * Decrypt a group message for myself.
 * Finds my entry in the serialized JSON payload and decrypts it using my shared key with the sender.
 */
export function decryptMessageGroup(
  payloadBytes: Uint8Array,
  myUserId: string,
  senderId: string,
  myPrivateKeyB64: string,
  senderPublicKeyB64: string
): string | null {
  try {
    const jsonStr = encodeUTF8(payloadBytes);
    const encryptedMap = JSON.parse(jsonStr);
    const entry = encryptedMap[myUserId];
    if (!entry) return null;

    const sharedKey = deriveSharedKey(senderPublicKeyB64, myPrivateKeyB64);
    const ciphertextBytes = decodeBase64(entry.ciphertextB64);
    return decryptMessageDirect(ciphertextBytes, entry.nonceB64, sharedKey);
  } catch (e) {
    console.error('[decryptMessageGroup] Decryption failed:', e);
    return null;
  }
}
