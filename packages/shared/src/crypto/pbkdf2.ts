import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

export function derivePasswordKey(password: string, salt: Uint8Array, keyLength?: number): Uint8Array {
  return pbkdf2(sha256, password, salt, { c: 100000, dkLen: keyLength || 32 });
}
