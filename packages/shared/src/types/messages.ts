// Client → Server messages
export type ClientMessage =
  | { type: 'create-room' }
  | { type: 'join-room'; roomId: string }
  | { type: 'exchange-key'; roomId: string; publicKey: string; salt: string }
  | { type: 'send-message'; roomId: string; encryptedData: string }
  | { type: 'destroy-room'; roomId: string }
  | { type: 'typing'; roomId: string };

// Server → Client messages
export type ServerMessage =
  | { type: 'room-created'; roomId: string }
  | { type: 'room-joined'; roomId: string; userId: string }
  | { type: 'peer-joined'; userId: string }
  | { type: 'peer-public-key'; publicKey: string; salt: string }
  | { type: 'new-message'; encryptedData: string }
  | { type: 'user-typing' }
  | { type: 'peer-disconnected' }
  | { type: 'room-destroyed' }
  | { type: 'error'; message: string };
