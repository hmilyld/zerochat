import { useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { ServerMessage } from '@zerochat/shared';

let typingTimer: ReturnType<typeof setTimeout> | null = null;

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function useWebSocket() {
  const setWs = useChatStore((s) => s.setWs);
  const setConnected = useChatStore((s) => s.setConnected);
  const setRoomInfo = useChatStore((s) => s.setRoomInfo);
  const setPeerKey = useChatStore((s) => s.setPeerKey);
  const addEncryptedMessage = useChatStore((s) => s.addEncryptedMessage);
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const setPeerConnected = useChatStore((s) => s.setPeerConnected);
  const setError = useChatStore((s) => s.setError);
  const reset = useChatStore((s) => s.reset);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'room-created':
      case 'room-joined':
        setRoomInfo(msg.roomId, msg.userId);
        break;
      case 'peer-joined':
        setPeerConnected(true);
        break;
      case 'peer-public-key':
        setPeerKey(msg.publicKey, msg.salt);
        break;
      case 'new-message':
        addEncryptedMessage({
          id: crypto.randomUUID(),
          encryptedData: msg.encryptedData,
          fromMe: false,
          timestamp: Date.now(),
        });
        break;
      case 'user-typing':
        setPeerTyping(true);
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setPeerTyping(false), 2000);
        break;
      case 'peer-disconnected':
        setPeerConnected(false);
        setPeerTyping(false);
        break;
      case 'room-destroyed':
        reset();
        break;
      case 'error':
        setError(msg.message);
        break;
    }
  }, []);

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_BASE);
    socket.onopen = () => {
      setWs(socket);
      setConnected(true);
      setError(null);
    };
    socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch {
        console.error('Failed to parse server message');
      }
    };
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setError('连接失败');
  }, []);

  const send = useCallback((data: object) => {
    const ws = useChatStore.getState().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    const ws = useChatStore.getState().ws;
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, []);

  return { connect, send, disconnect };
}
