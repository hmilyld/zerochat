import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { handleMessage, removeClient } from './handler.ts';

export function setupWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    perMessageDeflate: false,
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      handleMessage(ws, raw.toString());
    });

    ws.on('close', () => {
      removeClient(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  console.log('WebSocket server ready on /ws');
  return wss;
}
