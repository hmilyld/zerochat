import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '@zerochat/shared';
import { createRoom, getRoom, destroyRoom } from '../redis/client.ts';
import { randomBase64Url } from '@zerochat/shared';

interface RoomSocket extends WebSocket {
  userId?: string;
  roomId?: string;
}

const clients = new Map<string, RoomSocket>();

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomId: string, msg: ServerMessage, excludeUserId?: string): void {
  for (const [uid, ws] of clients) {
    if (ws.roomId === roomId && uid !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

export async function handleMessage(ws: RoomSocket, raw: string): Promise<void> {
  let data: ClientMessage;
  try {
    data = JSON.parse(raw);
  } catch {
    send(ws, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  switch (data.type) {
    case 'create-room':
    case 'join-room': {
      const roomId = data.type === 'create-room' ? randomBase64Url(16) : data.roomId;

      if (data.type === 'join-room') {
        const room = await getRoom(roomId);
        if (!room) {
          send(ws, { type: 'error', message: '房间不存在或已过期' });
          return;
        }
      } else {
        await createRoom(roomId);
      }

      // Remove old userId if reconnecting
      if (ws.userId) clients.delete(ws.userId);

      const userId = randomBase64Url(12);
      ws.userId = userId;
      ws.roomId = roomId;
      clients.set(userId, ws);
      send(ws, { type: 'room-joined', roomId, userId });
      console.log(`[SRV] ${data.type}: room=${roomId.slice(0,8)} userId=${userId.slice(0,8)}, ${[...clients.values()].filter(c => c.roomId === roomId).length} in room`);
      broadcastToRoom(roomId, { type: 'peer-joined', userId }, userId);
      break;
    }

    case 'exchange-key': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, {
        type: 'peer-public-key',
        publicKey: data.publicKey,
        salt: data.salt,
      }, ws.userId);
      break;
    }

    case 'send-message': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, {
        type: 'new-message',
        encryptedData: data.encryptedData,
      }, ws.userId);
      break;
    }

    case 'typing': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, { type: 'user-typing' }, ws.userId);
      break;
    }

    case 'destroy-room': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, { type: 'room-destroyed' });
      await destroyRoom(ws.roomId);
      for (const [uid, client] of clients) {
        if (client.roomId === ws.roomId) {
          client.close();
          clients.delete(uid);
        }
      }
      break;
    }
  }
}

export function removeClient(ws: RoomSocket): void {
  if (ws.userId) {
    clients.delete(ws.userId);
    if (ws.roomId) {
      broadcastToRoom(ws.roomId, { type: 'peer-disconnected' }, ws.userId);
    }
  }
}
