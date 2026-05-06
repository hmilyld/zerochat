import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatCrypto } from '@/hooks/useChatCrypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/MessageBubble';
import ImageUploader from '@/components/ImageUploader';
import QRCode from '@/components/QRCode';
import CopyButton from '@/components/CopyButton';
import { ArrowLeft, Send, AlertTriangle, Shield, ImageIcon, X, Loader2, Share2 } from 'lucide-react';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, disconnect } = useWebSocket();
  const peerConnected = useChatStore((s) => s.peerConnected);
  const peerPublicKey = useChatStore((s) => s.peerPublicKey);
  const connected = useChatStore((s) => s.connected);
  const decryptedMessages = useChatStore((s) => s.decryptedMessages);
  const encryptedMessages = useChatStore((s) => s.encryptedMessages);
  const addDecryptedMessage = useChatStore((s) => s.addDecryptedMessage);
  const peerTyping = useChatStore((s) => s.peerTyping);
  const reset = useChatStore((s) => s.reset);
  const storeRoomId = useChatStore((s) => s.roomId);

  const { getExchangeData, getFingerprint, encryptText, encryptImage, decryptMessage, isReady } = useChatCrypto(roomId);

  const [input, setInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [destroyConfirm, setDestroyConfirm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [remoteDestroyed, setRemoteDestroyed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const initialConnectRef = useRef(false);
  const joinedRef = useRef(false);
  const hadRoomRef = useRef(false);

  // Connect WebSocket and join room on mount
  useEffect(() => {
    if (!initialConnectRef.current) {
      initialConnectRef.current = true;
      connect();
    }
    return () => {
      disconnect();
    };
  }, []);

  // Send join-room once connected
  useEffect(() => {
    if (connected && roomId && !joinedRef.current) {
      joinedRef.current = true;
      send({ type: 'join-room', roomId });
    }
  }, [connected, roomId]);

  // Watch for remote room destruction (reset via WebSocket handler)
  useEffect(() => {
    if (storeRoomId) {
      hadRoomRef.current = true;
    } else if (hadRoomRef.current) {
      disconnect();
      setRemoteDestroyed(true);
    }
  }, [storeRoomId]);

  // Key exchange: send our key when we know someone is in the room and encryption not ready
  useEffect(() => {
    if (peerConnected && !isReady) {
      console.debug('[ChatRoom] sending exchange-key');
      const exchangeData = getExchangeData();
      send({
        type: 'exchange-key',
        roomId,
        ...exchangeData,
      });
    }
  }, [peerConnected, peerPublicKey, isReady, roomId]);

  // Decrypt new incoming messages
  useEffect(() => {
    const last = encryptedMessages[encryptedMessages.length - 1];
    console.debug('[ChatRoom] decrypt check:', {
      hasLast: !!last,
      processed: last ? processedRef.current.has(last.id) : false,
      fromMe: last?.fromMe,
      isReady,
      totalEncrypted: encryptedMessages.length,
    });

    if (!last || processedRef.current.has(last.id) || last.fromMe || !isReady) return;

    processedRef.current.add(last.id);

    decryptMessage(last.encryptedData)
      .then((result) => {
        console.debug('[ChatRoom] decrypt success:', result.isImage ? 'image' : result.content.slice(0, 20));
        addDecryptedMessage({
          id: last.id,
          ...result,
          fromMe: false,
          timestamp: last.timestamp,
        });
      })
      .catch((err) => {
        console.error('[ChatRoom] decrypt failed:', err);
        processedRef.current.delete(last.id); // allow retry
      });
  }, [encryptedMessages, isReady, decryptMessage, addDecryptedMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [decryptedMessages]);

  // Typing indicator
  useEffect(() => {
    if (!input.trim() || !isReady) return;
    send({ type: 'typing', roomId });
  }, [input]);

  const handleSendText = useCallback(async () => {
    if (!input.trim() || !isReady || encrypting) return;
    setEncrypting(true);
    try {
      const encrypted = await encryptText(input.trim());
      console.debug('[ChatRoom] sending encrypted message, length:', encrypted.length);
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      addDecryptedMessage({
        id: crypto.randomUUID(),
        content: input.trim(),
        isImage: false,
        fromMe: true,
        timestamp: Date.now(),
      });
      setInput('');
    } catch (err) {
      console.error('Encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [input, isReady, encrypting, encryptText, roomId, send, addDecryptedMessage]);

  const handleSendImage = useCallback(async (bytes: ArrayBuffer, mimeType: string) => {
    if (!isReady || encrypting) return;
    setEncrypting(true);
    try {
      const encrypted = await encryptImage(bytes, mimeType);
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      const blob = new Blob([bytes], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      addDecryptedMessage({
        id: crypto.randomUUID(),
        content: '',
        isImage: true,
        imageUrl,
        fromMe: true,
        timestamp: Date.now(),
      });
      setShowImageUpload(false);
    } catch (err) {
      console.error('Image encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [isReady, encrypting, encryptImage, roomId, send, addDecryptedMessage]);

  const handleDestroy = () => {
    send({ type: 'destroy-room', roomId });
    reset();
    navigate('/', { replace: true });
  };

  const fingerprint = getFingerprint();
  const inviteUrl = roomId ? `${window.location.origin}/chat?join=${roomId}` : '';

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-1 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => { disconnect(); reset(); navigate('/'); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">加密聊天</p>
              {roomId && (
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded truncate" title={roomId}>
                  {roomId.slice(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {peerConnected ? (isReady ? '已加密' : '协商密钥中...') : '等待对方加入...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            {fingerprint}
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="邀请对方"
            onClick={() => setShowInvite(true)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDestroyConfirm(true)}
          >
            销毁
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 px-1">
        {decryptedMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {peerTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image upload area */}
      {showImageUpload && (
        <div className="border-t p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">发送图片</span>
            <button onClick={() => setShowImageUpload(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <ImageUploader
            onImageReady={(bytes, mimeType) => handleSendImage(bytes, mimeType)}
            onClear={() => {}}
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 pt-2 pb-4 px-1 safe-bottom bg-white">
        <div className="flex items-end gap-2">
          <button
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={() => setShowImageUpload(!showImageUpload)}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="输入消息..."
            className="flex-1"
            disabled={!isReady || encrypting}
          />
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!input.trim() || !isReady || encrypting}
          >
            {encrypting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Invite dialog */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">邀请对方加入</h3>
              <button onClick={() => setShowInvite(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 break-all text-sm text-gray-800 font-mono">
              {roomId}
            </div>
            <p className="text-xs text-gray-500">将房间 ID 或下方链接发送给对方，对方在首页点击"加入已有房间"输入即可</p>
            <div className="bg-gray-50 rounded-lg p-3 break-all text-xs text-gray-600 font-mono">
              {inviteUrl}
            </div>
            <div className="flex gap-2">
              <CopyButton text={roomId!} label="复制房间号" />
              <CopyButton text={inviteUrl} label="复制链接" />
            </div>
            <QRCode url={inviteUrl} />
          </div>
        </div>
      )}

      {/* Remote destroyed dialog */}
      {remoteDestroyed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-gray-900">房间已销毁</h3>
                <p className="text-sm text-gray-500">对方已销毁该房间，所有聊天记录已清除</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
              返回首页
            </Button>
          </div>
        </div>
      )}

      {/* Destroy confirmation dialog */}
      {destroyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-semibold text-gray-900">确认销毁房间？</h3>
                <p className="text-sm text-gray-500">双方的所有聊天记录将立即清除，不可恢复</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDestroyConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDestroy}>
                确认销毁
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
