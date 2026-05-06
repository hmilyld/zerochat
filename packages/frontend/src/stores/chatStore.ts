import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  encryptedData: string;
  fromMe: boolean;
  timestamp: number;
}

export interface DecryptedMessage {
  id: string;
  content: string;
  isImage: boolean;
  imageUrl?: string;
  fromMe: boolean;
  timestamp: number;
}

interface ChatState {
  ws: WebSocket | null;
  connected: boolean;
  roomId: string | null;
  userId: string | null;
  peerPublicKey: string | null;
  peerSalt: string | null;
  aesKey: CryptoKey | null;
  encryptedMessages: ChatMessage[];
  decryptedMessages: DecryptedMessage[];
  peerTyping: boolean;
  peerConnected: boolean;
  error: string | null;

  setWs: (ws: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setRoomInfo: (roomId: string, userId: string) => void;
  setPeerKey: (publicKey: string, salt: string) => void;
  setAesKey: (key: CryptoKey) => void;
  addEncryptedMessage: (msg: ChatMessage) => void;
  addDecryptedMessage: (msg: DecryptedMessage) => void;
  setPeerTyping: (v: boolean) => void;
  setPeerConnected: (v: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

const initialState = {
  ws: null,
  connected: false,
  roomId: null,
  userId: null,
  peerPublicKey: null,
  peerSalt: null,
  aesKey: null,
  encryptedMessages: [],
  decryptedMessages: [],
  peerTyping: false,
  peerConnected: false,
  error: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setWs: (ws) => set({ ws }),
  setConnected: (v) => set({ connected: v }),
  setRoomInfo: (roomId, userId) => set({ roomId, userId }),
  setPeerKey: (publicKey, salt) => set({ peerPublicKey: publicKey, peerSalt: salt }),
  setAesKey: (key) => set({ aesKey: key }),
  addEncryptedMessage: (msg) =>
    set((s) => ({ encryptedMessages: [...s.encryptedMessages, msg] })),
  addDecryptedMessage: (msg) =>
    set((s) => ({ decryptedMessages: [...s.decryptedMessages, msg] })),
  setPeerTyping: (v) => set({ peerTyping: v }),
  setPeerConnected: (v) => set({ peerConnected: v }),
  setError: (err) => set({ error: err }),
  reset: () => set(initialState),
}));
