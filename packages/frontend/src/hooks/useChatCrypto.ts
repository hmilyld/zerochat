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
  encryptAES,
  decryptAES,
} from '@zerochat/shared';
import type { KeyPair } from '@zerochat/shared';

export function useChatCrypto(roomId?: string) {
  const peerPublicKey = useChatStore((s) => s.peerPublicKey);
  const peerSalt = useChatStore((s) => s.peerSalt);
  const aesKey = useChatStore((s) => s.aesKey);
  const setAesKey = useChatStore((s) => s.setAesKey);

  const keyPairRef = useRef<KeyPair>(generateKeyPair());

  // Derive AES key when peer's public key arrives — uses @noble/ciphers (no crypto.subtle needed)
  useEffect(() => {
    if (!peerPublicKey) return;

    const peerPubBytes = base64ToPublicKey(peerPublicKey);
    const sharedSecret = computeSharedSecret(keyPairRef.current.privateKey, peerPubBytes);
    const saltBytes = new TextEncoder().encode(roomId || 'zerochat');
    const aesKeyRaw = deriveAESKey(sharedSecret, saltBytes, 'zerochat-room-key');

    setAesKey(aesKeyRaw);
  }, [peerPublicKey, roomId, setAesKey]);

  // Encrypt text with @noble/ciphers AES-GCM
  const encryptText = useCallback(async (text: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const encoded = new TextEncoder().encode(text);
    return encryptAES(aesKey, encoded);
  }, [aesKey]);

  // Decrypt with @noble/ciphers AES-GCM
  const decryptToText = useCallback(async (encryptedBase64: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const plaintext = decryptAES(aesKey, encryptedBase64);
    if (!plaintext) throw new Error('Decryption failed');
    return new TextDecoder().decode(plaintext);
  }, [aesKey]);

  // Encrypt an image
  const encryptImage = useCallback(async (imageBytes: ArrayBuffer, mimeType: string, caption?: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');

    const imgArr = new Uint8Array(imageBytes);
    let plaintext: Uint8Array;

    if (caption && caption.trim()) {
      // IMAGE_TEXT format: prefix + mime + \x00 + 4-byte imgLen + image + text
      const prefix = new TextEncoder().encode('IMAGE_TEXT:' + mimeType + '\x00');
      const lenBuf = new Uint8Array(4);
      new DataView(lenBuf.buffer).setUint32(0, imgArr.length);
      const textBytes = new TextEncoder().encode(caption.trim());

      const total = prefix.length + 4 + imgArr.length + textBytes.length;
      plaintext = new Uint8Array(total);
      let off = 0;
      plaintext.set(prefix, off); off += prefix.length;
      plaintext.set(lenBuf, off); off += 4;
      plaintext.set(imgArr, off); off += imgArr.length;
      plaintext.set(textBytes, off);
    } else {
      // IMAGE format: prefix + mime + \x00 + image
      const prefix = new TextEncoder().encode('IMAGE:' + mimeType + '\x00');
      plaintext = new Uint8Array(prefix.length + imgArr.length);
      plaintext.set(prefix);
      plaintext.set(imgArr, prefix.length);
    }

    return encryptAES(aesKey, plaintext);
  }, [aesKey]);

  // Decrypt message and determine type
  const decryptMessage = useCallback(async (encryptedBase64: string): Promise<{
    content: string;
    isImage: boolean;
    imageUrl?: string;
  }> => {
    const raw = decryptAES(aesKey!, encryptedBase64);
    if (!raw) throw new Error('Decryption failed');

    // Check header prefix (raw bytes at start)
    const header = new TextDecoder().decode(raw.slice(0, Math.min(30, raw.length)));

    if (header.startsWith('IMAGE_TEXT:')) {
      // Parse: "IMAGE_TEXT:" + mime + \x00 + 4-byte imgLen + image + text
      const mimeEnd = findNull(raw, 11); // skip "IMAGE_TEXT:"
      const mimeType = new TextDecoder().decode(raw.slice(11, mimeEnd));

      const imgLen = new DataView(raw.buffer, raw.byteOffset + mimeEnd + 1, 4).getUint32(0);
      const imgStart = mimeEnd + 5;
      const imgEnd = imgStart + imgLen;
      const imgBytes = raw.slice(imgStart, imgEnd);
      const caption = new TextDecoder().decode(raw.slice(imgEnd));

      const blob = new Blob([imgBytes], { type: mimeType });
      return { content: caption, isImage: true, imageUrl: URL.createObjectURL(blob) };
    }

    if (header.startsWith('IMAGE:')) {
      const mimeEnd = findNull(raw, 6); // skip "IMAGE:"
      const mimeType = new TextDecoder().decode(raw.slice(6, mimeEnd));
      const imgBytes = raw.slice(mimeEnd + 1);
      const blob = new Blob([imgBytes], { type: mimeType });
      return { content: '', isImage: true, imageUrl: URL.createObjectURL(blob) };
    }

    return { content: new TextDecoder().decode(raw), isImage: false };
  }, [aesKey]);

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

function findNull(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] === 0) return i;
  }
  return bytes.length;
}
