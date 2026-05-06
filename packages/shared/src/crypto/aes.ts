import { gcm } from '@noble/ciphers/aes';
import { randomBytes, bytesToBase64, base64ToBytes, concatBytes } from './random.ts';

const NONCE_LEN = 12;

export function encryptAES(key: Uint8Array, plaintext: Uint8Array): string {
  const nonce = randomBytes(NONCE_LEN);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);
  const combined = concatBytes(nonce, ciphertext);
  return bytesToBase64(combined);
}

export function decryptAES(key: Uint8Array, base64Data: string): Uint8Array | null {
  try {
    const combined = base64ToBytes(base64Data);
    if (combined.length < NONCE_LEN + 16) return null;
    const nonce = combined.slice(0, NONCE_LEN);
    const ciphertext = combined.slice(NONCE_LEN);
    const cipher = gcm(key, nonce);
    return cipher.decrypt(ciphertext);
  } catch {
    return null;
  }
}
