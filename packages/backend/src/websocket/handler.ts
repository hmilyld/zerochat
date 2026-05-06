import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '@zerochat/shared';
import { createRoom, joinRoom, destroyRoom } from '../redis/client.ts';
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
    case 'create-room': {
      const roomId = randomBase64Url(16);
      await createRoom(roomId);
      const userId = randomBase64Url(12);
      ws.userId = userId;
      ws.roomId = roomId;
      clients.set(userId, ws);
      send(ws, { type: 'room-created', roomId });
      send(ws, { type: 'room-joined', roomId, userId });
      break;
    }

    case 'join-room': {
      const result = await joinRoom(data.roomId, 'dummy');
      if (result === -1) {
        send(ws, { type: 'error', message: '房间不存在或已过期' });
        return;
      }
      if (result === -2) {
        send(ws, { type: 'error', message: '房间已满' });
        return;
      }
      const userId = randomBase64Url(12);
      ws.userId = userId;
      ws.roomId = data.roomId;
      clients.set(userId, ws);
      send(ws, { type: 'room-joined', roomId: data.roomId, userId });
      broadcastToRoom(data.roomId, { type: 'peer-joined', userId }, userId);
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
