import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

export function deriveAESKey(sharedSecret: Uint8Array, salt: Uint8Array, info: string): Uint8Array {
  const infoBytes = new TextEncoder().encode(info);
  return hkdf(sha256, sharedSecret, salt, infoBytes, 32);
}
