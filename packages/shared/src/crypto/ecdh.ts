import { x25519 } from '@noble/curves/ed25519';
import { randomBytes, bytesToBase64, base64ToBytes } from './random.ts';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function computeSharedSecret(privateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(privateKey, peerPublicKey);
}

export function publicKeyToBase64(pk: Uint8Array): string {
  return bytesToBase64(pk);
}

export function base64ToPublicKey(b64: string): Uint8Array {
  return base64ToBytes(b64);
}

export function privateKeyToBase64(sk: Uint8Array): string {
  return bytesToBase64(sk);
}

export function base64ToPrivateKey(b64: string): Uint8Array {
  return base64ToBytes(b64);
}
