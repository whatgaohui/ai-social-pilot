/**
 * AES-256-CBC Encryption Utilities
 *
 * Provides encrypt/decrypt functions for sensitive data (API keys, tokens, secrets)
 * stored in the database. Uses a random IV per encryption and prepends it to
 * the ciphertext in the format `iv:ciphertext` (both hex-encoded).
 *
 * - Key source: `ENCRYPTION_KEY` environment variable (32 bytes for AES-256)
 * - Fallback: a development-only key with a console warning
 * - Only uses Node.js built-in `crypto` module (no external deps)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for CBC IV

// Development fallback key — MUST NOT be used in production
const DEV_KEY_SALT = 'ai-social-pilot-dev-salt-v1';

let _key: Buffer | null = null;

/**
 * Resolve the encryption key. If ENCRYPTION_KEY env var is set, derive a 32-byte
 * key via scrypt. Otherwise fall back to a deterministic dev key and log a warning.
 */
function getKey(): Buffer {
  if (_key) return _key;

  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey) {
    // Derive a stable 32-byte key from the user-provided secret via scrypt
    _key = scryptSync(envKey, 'ai-social-pilot-salt', 32);
  } else {
    console.warn(
      '[crypto] WARNING: ENCRYPTION_KEY is not set. Using development fallback key. ' +
      'Set ENCRYPTION_KEY in production for proper security.'
    );
    _key = scryptSync('dev-only-fallback-key-do-not-use-in-prod', DEV_KEY_SALT, 32);
  }

  return _key;
}

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns `iv:ciphertext` where both parts are hex-encoded.
 * A fresh random IV is generated for every call.
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-CBC encrypted string (format: `iv:ciphertext`).
 * Returns the original plaintext, or an empty string on error (logs the error).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // Not encrypted (legacy plain-text data) — return as-is so we don't break existing records
      return encryptedText;
    }

    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const ciphertext = parts[1];

    const decipher = createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[crypto] Decryption failed:', error);
    return '';
  }
}

/**
 * Encrypt multiple fields on an object by replacing their values in-place.
 * Returns a new object with specified fields encrypted.
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      (result as Record<string, unknown>)[field as string] = encrypt(value);
    }
  }
  return result;
}

/**
 * Decrypt multiple fields on an object by replacing their values in-place.
 * Returns a new object with specified fields decrypted.
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      (result as Record<string, unknown>)[field as string] = decrypt(value);
    }
  }
  return result;
}
