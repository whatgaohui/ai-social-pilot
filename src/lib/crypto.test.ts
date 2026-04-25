import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptFields, decryptFields } from '@/lib/crypto';

describe('Crypto Module', () => {
  describe('encrypt', () => {
    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
    });

    it('should produce a string with iv:ciphertext format', () => {
      const result = encrypt('hello world');
      const parts = result.split(':');
      expect(parts).toHaveLength(2);
      // IV is 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Ciphertext should be non-empty hex string
      expect(parts[1]).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const plaintext = 'same-input-for-test';
      const result1 = encrypt(plaintext);
      const result2 = encrypt(plaintext);
      // Due to random IV, the full encrypted strings should differ
      expect(result1).not.toBe(result2);
    });
  });

  describe('decrypt', () => {
    it('should return empty string for empty input', () => {
      expect(decrypt('')).toBe('');
    });

    it('should correctly roundtrip encrypt → decrypt', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should roundtrip with unicode characters', () => {
      const plaintext = '中文密钥 🔑 日本語テスト';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return original string for non-encrypted (legacy compat) strings', () => {
      // A string without the iv:ciphertext format should be returned as-is
      const legacyValue = 'plain-text-api-key-no-colons';
      expect(decrypt(legacyValue)).toBe(legacyValue);
    });

    it('should return empty string for strings with exactly one colon but invalid ciphertext', () => {
      // This is an edge case - a string with one colon but invalid hex data
      // The decrypt function will try to decipher and fail, returning ''
      const result = decrypt('abcd:xyz');
      expect(result).toBe('');
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should work with various input lengths', () => {
      const inputs = ['a', 'ab', 'abc', 'a'.repeat(100), 'a'.repeat(1000)];
      for (const input of inputs) {
        const encrypted = encrypt(input);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(input);
      }
    });
  });

  describe('encryptFields / decryptFields', () => {
    it('should encrypt and decrypt specified fields on an object', () => {
      const obj = { apiKey: 'secret-key', name: 'test', token: 'tok123' };
      const encrypted = encryptFields(obj, ['apiKey']);
      // apiKey should be different (encrypted), name should be unchanged
      expect(encrypted.apiKey).not.toBe('secret-key');
      expect(encrypted.name).toBe('test');
      expect(encrypted.token).toBe('tok123');

      // Decrypt back
      const decrypted = decryptFields(encrypted, ['apiKey']);
      expect(decrypted.apiKey).toBe('secret-key');
      expect(decrypted.name).toBe('test');
    });

    it('should skip empty string fields', () => {
      const obj = { apiKey: '', name: 'test' };
      const encrypted = encryptFields(obj, ['apiKey']);
      expect(encrypted.apiKey).toBe('');
    });

    it('should skip non-string fields', () => {
      const obj = { apiKey: 12345, name: 'test' };
      const encrypted = encryptFields(obj, ['apiKey' as keyof typeof obj]);
      // Non-string should be left as-is
      expect(encrypted.apiKey).toBe(12345);
    });
  });
});
