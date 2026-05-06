import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import {
  base64ToPublicKey,
  publicKeyToBase64,
  bytesToBase64,
  base64ToBytes,
  randomBytes,
  generateKeyPair,
  computeSharedSecret,
  deriveAESKey,
} from '@zerochat/shared';
import type { KeyPair } from '@zerochat/shared';

export function useChatCrypto() {
  const peerPublicKey = useChatStore((s) => s.peerPublicKey);
  const peerSalt = useChatStore((s) => s.peerSalt);
  const aesKey = useChatStore((s) => s.aesKey);
  const setAesKey = useChatStore((s) => s.setAesKey);

  const keyPairRef = useRef<KeyPair>(generateKeyPair());

  async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  useEffect(() => {
    if (!peerPublicKey || !peerSalt) return;

    const peerPubBytes = base64ToPublicKey(peerPublicKey);
    const saltBytes = base64ToBytes(peerSalt);
    const sharedSecret = computeSharedSecret(keyPairRef.current.privateKey, peerPubBytes);
    const aesKeyRaw = deriveAESKey(sharedSecret, saltBytes, 'zerochat-room-key');

    importAesKey(aesKeyRaw).then((key) => {
      setAesKey(key);
    });
  }, [peerPublicKey, peerSalt, setAesKey]);

  const encryptText = useCallback(async (text: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const iv = randomBytes(12);
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoded
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(combined);
  }, [aesKey]);

  const decryptToBytes = useCallback(async (encryptedBase64: string): Promise<Uint8Array> => {
    if (!aesKey) throw new Error('No AES key');
    const combined = base64ToBytes(encryptedBase64);
    if (combined.length < 13) throw new Error('Invalid encrypted data');
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ciphertext
    );
    return new Uint8Array(plaintext);
  }, [aesKey]);

  const decryptText = useCallback(async (encryptedBase64: string): Promise<string> => {
    const bytes = await decryptToBytes(encryptedBase64);
    return new TextDecoder().decode(bytes);
  }, [decryptToBytes]);

  const encryptImage = useCallback(async (imageBytes: ArrayBuffer, mimeType: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const iv = randomBytes(12);
    const imgB64 = bytesToBase64(new Uint8Array(imageBytes));
    const prefix = `IMG:${mimeType}\x00${imgB64}`;
    const plaintext = new TextEncoder().encode(prefix);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plaintext
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(combined);
  }, [aesKey]);

  const decryptMessage = useCallback(async (encryptedBase64: string): Promise<{
    content: string;
    isImage: boolean;
    imageUrl?: string;
  }> => {
    const decrypted = await decryptText(encryptedBase64);
    if (decrypted.startsWith('IMG:')) {
      const nullIdx = decrypted.indexOf('\x00');
      const mimeType = decrypted.slice(4, nullIdx);
      const imgBase64 = decrypted.slice(nullIdx + 1);
      const imgBytes = base64ToBytes(imgBase64);
      const blob = new Blob([imgBytes], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      return { content: '', isImage: true, imageUrl };
    }
    return { content: decrypted, isImage: false };
  }, [decryptText]);

  const getExchangeData = (): { publicKey: string; salt: string } => {
    const salt = randomBytes(32);
    return {
      publicKey: publicKeyToBase64(keyPairRef.current.publicKey),
      salt: bytesToBase64(salt),
    };
  };

  const getFingerprint = (): string => {
    const pkB64 = publicKeyToBase64(keyPairRef.current.publicKey);
    return pkB64.slice(0, 8);
  };

  return {
    getExchangeData,
    getFingerprint,
    encryptText,
    encryptImage,
    decryptMessage,
    isReady: !!aesKey,
  };
}
